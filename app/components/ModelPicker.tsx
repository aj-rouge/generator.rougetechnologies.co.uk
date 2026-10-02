// app/components/ModelPicker.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Star, Loader2, Search } from "lucide-react";
import type { ReasoningEffort } from "../utils/openrouter/reasoning";

export interface ModelOption {
  slug: string;
  name: string;
  provider: string;
  context_length: number;
  description: string;
  isFree: boolean;
  inputPricePerM: number;
  outputPricePerM: number;
  /** Model has a thinking channel at all. */
  supportsReasoning: boolean;
  /** Thinking is on unless you disable it. */
  reasoningByDefault: boolean;
  reasoningMandatory: boolean;
  reasoningDefaultEffort?: ReasoningEffort;
  reasoningSupportedEfforts?: ReasoningEffort[] | null;
  supportsReasoningMaxTokens: boolean;
  inputModalities: string[];
  outputModalities: string[];
  isReasoningFirst?: boolean;
}

export interface ModelGroups {
  reasoningByDefault: ModelOption[];
  reasoningCapable: ModelOption[];
  standard: ModelOption[];
  counts: {
    total: number;
    reasoningByDefault: number;
    reasoningCapable: number;
    standard: number;
    free: number;
  };
}

interface ModelsApiResponse {
  success: boolean;
  data?: ModelGroups & { bySlug?: Record<string, ModelOption> };
  error?: string;
}

// ---------------------------------------------------------------------------
// Shared model cache — one fetch for the whole page.
// ---------------------------------------------------------------------------
type ModelsState = {
  loading: boolean;
  error: string | null;
  groups: ModelGroups;
  models: ModelOption[];
  lookup: (slug: string) => ModelOption | null;
};

const EMPTY_GROUPS: ModelGroups = {
  reasoningByDefault: [],
  reasoningCapable: [],
  standard: [],
  counts: {
    total: 0,
    reasoningByDefault: 0,
    reasoningCapable: 0,
    standard: 0,
    free: 0,
  },
};

let cachePromise: Promise<ModelGroups> | null = null;
let cachedGroups: ModelGroups | null = null;
let cachedList: ModelOption[] = [];
let cachedBySlug: Record<string, ModelOption> = {};

function loadModels(): Promise<ModelGroups> {
  if (cachedGroups) return Promise.resolve(cachedGroups);
  if (cachePromise) return cachePromise;

  cachePromise = fetch("/api/models")
    .then((r) => r.json() as Promise<ModelsApiResponse>)
    .then((json) => {
      if (!json.success || !json.data) {
        throw new Error(json.error || "Failed to load models");
      }
      const { bySlug, ...groups } = json.data;
      cachedBySlug = bySlug ?? {};
      cachedGroups = groups as ModelGroups;
      cachedList = [
        ...cachedGroups.reasoningByDefault,
        ...cachedGroups.reasoningCapable,
        ...cachedGroups.standard,
      ];
      return cachedGroups;
    })
    .catch((err) => {
      cachePromise = null; // allow retry
      throw err;
    });

  return cachePromise;
}

export function invalidateModels() {
  cachePromise = null;
  cachedGroups = null;
  cachedList = [];
  cachedBySlug = {};
}

export function useModels(): Omit<ModelsState, "loading" | "error"> & {
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: !cachedGroups, error: null });

  useEffect(() => {
    if (cachedGroups) return;
    let alive = true;
    loadModels()
      .then(() => alive && setState({ loading: false, error: null }))
      .catch((err: Error) =>
        alive ? setState({ loading: false, error: err.message }) : undefined,
      );
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(
    () => ({
      ...state,
      groups: cachedGroups ?? EMPTY_GROUPS,
      models: cachedList,
      lookup: (slug: string) => cachedBySlug[slug] ?? null,
    }),
    [state.loading, state.error],
  );
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------
const FAVORITE_KEY = "preferred_model_slug";

function priceBadge(m: ModelOption): string {
  if (m.isFree) return "free";
  if (m.inputPricePerM === 0 && m.outputPricePerM === 0) return "free";
  const inP = m.inputPricePerM.toFixed(2);
  const outP = m.outputPricePerM.toFixed(2);
  return `$${inP}/$${outP} per M`;
}

function ctxBadge(m: ModelOption): string {
  if (m.context_length >= 1000)
    return `${Math.round(m.context_length / 1000)}k ctx`;
  return `${m.context_length} ctx`;
}

interface ModelPickerProps {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
  showFavorite?: boolean;
  showSearch?: boolean;
}

export function ModelPicker({
  value,
  onChange,
  className = "",
  showFavorite = true,
  showSearch = false,
}: ModelPickerProps) {
  const { loading, error, groups, models, lookup } = useModels();
  const [favorite, setFavorite] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      setFavorite(localStorage.getItem(FAVORITE_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  // Default selection once models arrive.
  useEffect(() => {
    if (value || models.length === 0) return;
    const stored = (() => {
      try {
        return localStorage.getItem(FAVORITE_KEY);
      } catch {
        return null;
      }
    })();
    const pick =
      (stored && lookup(stored)) ||
      groups.standard[0] ||
      groups.reasoningByDefault[0] ||
      models[0];
    if (pick) onChange(pick.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models.length, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return {
      reasoningByDefault: groups.reasoningByDefault.filter((m) =>
        `${m.name} ${m.provider} ${m.slug}`.toLowerCase().includes(q),
      ),
      reasoningCapable: groups.reasoningCapable.filter((m) =>
        `${m.name} ${m.provider} ${m.slug}`.toLowerCase().includes(q),
      ),
      standard: groups.standard.filter((m) =>
        `${m.name} ${m.provider} ${m.slug}`.toLowerCase().includes(q),
      ),
    };
  }, [query, groups]);

  const shown = filtered ?? groups;
  const total =
    shown.reasoningByDefault.length +
    shown.reasoningCapable.length +
    shown.standard.length;

  const handleToggleFavorite = () => {
    if (!value) return;
    const next = favorite === value ? null : value;
    setFavorite(next);
    try {
      if (next) localStorage.setItem(FAVORITE_KEY, next);
      else localStorage.removeItem(FAVORITE_KEY);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading models…
      </span>
    );
  }
  if (error) {
    return (
      <span className={`text-xs text-red-500 ${className}`}>
        Failed to load models: {error}
      </span>
    );
  }
  if (groups.counts.total === 0) {
    return (
      <span className={`text-xs text-gray-500 ${className}`}>
        No models available
      </span>
    );
  }

  const selected = lookup(value);

  const renderOptions = (list: ModelOption[]) =>
    list.map((m) => (
      <option key={m.slug} value={m.slug}>
        {m.reasoningMandatory
          ? "🧠* "
          : m.reasoningByDefault
            ? "🧠 "
            : m.supportsReasoning
              ? "🧠+ "
              : ""}
        {m.name} ({m.provider}) · {priceBadge(m)} · {ctxBadge(m)}
      </option>
    ));

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className="inline-flex items-center gap-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-[320px]"
          title={selected?.description || "Select a model"}
        >
          {shown.reasoningByDefault.length > 0 && (
            <optgroup label="🧠 Thinking models (on by default)">
              {renderOptions(shown.reasoningByDefault)}
            </optgroup>
          )}
          {shown.reasoningCapable.length > 0 && (
            <optgroup label="🧠+ Thinking available (off by default)">
              {renderOptions(shown.reasoningCapable)}
            </optgroup>
          )}
          {shown.standard.length > 0 && (
            <optgroup label="⚡ Standard (fast, no thinking)">
              {renderOptions(shown.standard)}
            </optgroup>
          )}
        </select>

        {showFavorite && (
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={
              favorite === value
                ? "Remove as your default model"
                : "Set as your default model"
            }
            className={`p-1 rounded transition-colors ${
              favorite === value
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-400 hover:text-yellow-500"
            }`}
          >
            <Star
              className="w-4 h-4"
              fill={favorite === value ? "currentColor" : "none"}
            />
          </button>
        )}

        {showSearch && (
          <div className="inline-flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800">
            <Search className="w-3 h-3 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="filter…"
              className="w-20 text-xs bg-transparent outline-none text-gray-900 dark:text-gray-100"
            />
          </div>
        )}
      </div>

      {query && total === 0 && (
        <span className="text-[11px] text-gray-500">
          No model matches “{query}”.
        </span>
      )}
    </div>
  );
}
