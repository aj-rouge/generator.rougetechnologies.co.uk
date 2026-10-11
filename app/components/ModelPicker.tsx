// app/components/ModelPicker.tsx
"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Star, Loader2, Search, ChevronDown, Check } from "lucide-react";
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

function reasoningGlyph(m: ModelOption): string {
  if (m.reasoningMandatory) return "🧠*";
  if (m.reasoningByDefault) return "🧠";
  if (m.supportsReasoning) return "🧠+";
  return "";
}

function matchesQuery(m: ModelOption, q: string): boolean {
  if (!q) return true;
  return `${m.name} ${m.provider} ${m.slug}`.toLowerCase().includes(q);
}

type Row =
  | { kind: "header"; label: string }
  | { kind: "model"; model: ModelOption };

interface ModelPickerProps {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
  showFavorite?: boolean;
  /** @deprecated Search is always available now; kept for API compatibility. */
  showSearch?: boolean;
}

export function ModelPicker({
  value,
  onChange,
  className = "",
  showFavorite = true,
}: ModelPickerProps) {
  const { loading, error, groups, models, lookup } = useModels();
  const [favorite, setFavorite] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Load persisted favorite.
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

  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => ({
      reasoningByDefault: groups.reasoningByDefault.filter((m) =>
        matchesQuery(m, q),
      ),
      reasoningCapable: groups.reasoningCapable.filter((m) =>
        matchesQuery(m, q),
      ),
      standard: groups.standard.filter((m) => matchesQuery(m, q)),
    }),
    [groups, q],
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const push = (label: string, list: ModelOption[]) => {
      if (!list.length) return;
      out.push({ kind: "header", label });
      for (const m of list) out.push({ kind: "model", model: m });
    };
    push("🧠 Thinking models (on by default)", filtered.reasoningByDefault);
    push("🧠+ Thinking available (off by default)", filtered.reasoningCapable);
    push("⚡ Standard (fast, no thinking)", filtered.standard);
    return out;
  }, [filtered]);

  const slugs = useMemo(
    () => rows.flatMap((r) => (r.kind === "model" ? [r.model.slug] : [])),
    [rows],
  );

  // Focus the search input as soon as the popover opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open || !activeSlug) return;
    const el = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-slug]") ?? [],
    ).find((n) => n.dataset.slug === activeSlug);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeSlug, open, rows]);

  const allSlugs = useMemo(
    () =>
      [
        ...groups.reasoningByDefault,
        ...groups.reasoningCapable,
        ...groups.standard,
      ].map((m) => m.slug),
    [groups],
  );

  const openMenu = () => {
    setQuery("");
    const initial =
      value && allSlugs.includes(value) ? value : (allSlugs[0] ?? null);
    setActiveSlug(initial);
    setOpen(true);
  };

  const handleQueryChange = (v: string) => {
    setQuery(v);
    const ql = v.trim().toLowerCase();
    const first =
      groups.reasoningByDefault.find((m) => matchesQuery(m, ql)) ??
      groups.reasoningCapable.find((m) => matchesQuery(m, ql)) ??
      groups.standard.find((m) => matchesQuery(m, ql)) ??
      null;
    setActiveSlug(first?.slug ?? null);
  };

  const commit = (slug: string) => {
    onChange(slug);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!slugs.length) return;
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const cur = activeSlug ? slugs.indexOf(activeSlug) : -1;
        const next =
          cur < 0
            ? dir === 1
              ? 0
              : slugs.length - 1
            : Math.min(Math.max(cur + dir, 0), slugs.length - 1);
        setActiveSlug(slugs[next]);
        break;
      }
      case "Enter":
        e.preventDefault();
        if (activeSlug) commit(activeSlug);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Home":
        e.preventDefault();
        if (slugs.length) setActiveSlug(slugs[0]);
        break;
      case "End":
        e.preventDefault();
        if (slugs.length) setActiveSlug(slugs[slugs.length - 1]);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

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
  const selectedGlyph = selected ? reasoningGlyph(selected) : "";

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu())}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={selected?.description || "Select a model"}
          className="inline-flex items-center gap-2 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-[320px] min-w-[180px] text-left"
        >
          <span className="truncate flex-1">
            {selected ? (
              <>
                {selectedGlyph && <span className="mr-1">{selectedGlyph}</span>}
                {selected.name}{" "}
                <span className="text-gray-500 dark:text-gray-400">
                  ({selected.provider})
                </span>
              </>
            ) : (
              <span className="text-gray-400">Select a model…</span>
            )}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

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
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[360px] max-w-[90vw] overflow-hidden rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">
            <Search className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search models…"
              className="flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
            />
          </div>

          <ul
            ref={listRef}
            role="listbox"
            className="max-h-72 overflow-y-auto py-1"
          >
            {rows.length === 0 ? (
              <li className="px-3 py-2 text-[11px] text-gray-500">
                No model matches “{query}”.
              </li>
            ) : (
              rows.map((row, i) =>
                row.kind === "header" ? (
                  <li
                    key={`h-${i}`}
                    className="select-none px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {row.label}
                  </li>
                ) : (
                  <li
                    key={row.model.slug}
                    role="option"
                    aria-selected={row.model.slug === value}
                    data-slug={row.model.slug}
                    onMouseEnter={() => setActiveSlug(row.model.slug)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(row.model.slug)}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs ${
                      row.model.slug === activeSlug
                        ? "bg-blue-50 dark:bg-blue-900/30"
                        : ""
                    } ${row.model.slug === value ? "font-medium" : ""}`}
                  >
                    <span className="flex w-3 shrink-0 justify-center">
                      {row.model.slug === value && (
                        <Check className="w-3 h-3 text-blue-500" />
                      )}
                    </span>
                    <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
                      {reasoningGlyph(row.model) && (
                        <span className="mr-1">
                          {reasoningGlyph(row.model)}
                        </span>
                      )}
                      {row.model.name}
                      <span className="text-gray-500 dark:text-gray-400">
                        {" "}
                        ({row.model.provider})
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-500 dark:text-gray-400">
                      {priceBadge(row.model)} · {ctxBadge(row.model)}
                    </span>
                  </li>
                ),
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
