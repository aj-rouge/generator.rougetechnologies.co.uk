// app/components/ModelPicker.tsx
"use client";
import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";

export interface ModelOption {
  slug: string;
  name: string;
  provider: string;
  context_length: number;
  description: string;
  isReasoningFirst: boolean;
  isFree: boolean;
  inputPricePerM: number;
  outputPricePerM: number;
}

interface ModelGroups {
  standard: ModelOption[];
  reasoning: ModelOption[];
  counts?: {
    standard: number;
    reasoning: number;
    paidStandard: number;
    freeStandard: number;
  };
}

interface ModelsApiResponse {
  success: boolean;
  data?: ModelGroups;
  error?: string;
}

interface ModelPickerProps {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
  showFavorite?: boolean;
}

const FAVORITE_KEY = "preferred_model_slug";

export function ModelPicker({
  value,
  onChange,
  className = "",
  showFavorite = true,
}: ModelPickerProps) {
  const [groups, setGroups] = useState<ModelGroups>({
    standard: [],
    reasoning: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITE_KEY);
      if (stored) setFavorite(stored);
    } catch {
      /* ignore */
    }

    fetch("/api/models")
      .then((r) => r.json() as Promise<ModelsApiResponse>)
      .then((j) => {
        if (!j.success || !j.data) {
          setError(j.error || "Failed to load models");
          return;
        }
        const data = j.data;
        setGroups(data);

        if (!value) {
          const stored = (() => {
            try {
              return localStorage.getItem(FAVORITE_KEY);
            } catch {
              return null;
            }
          })();
          const all = [...data.standard, ...data.reasoning];
          const pick =
            (stored && all.find((m) => m.slug === stored)) ||
            data.standard[0] ||
            data.reasoning[0];
          if (pick) onChange(pick.slug);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const total = groups.standard.length + groups.reasoning.length;
  if (total === 0) {
    return (
      <span className={`text-xs text-gray-500 ${className}`}>
        No models available
      </span>
    );
  }

  const selectedModel = [...groups.standard, ...groups.reasoning].find(
    (m) => m.slug === value,
  );

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-[280px]"
        title={selectedModel?.description || "Select a model"}
      >
        <optgroup label="Standard (fast)">
          {groups.standard.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name} ({m.provider}){m.isFree ? " · free" : ""}
            </option>
          ))}
        </optgroup>
        {groups.reasoning.length > 0 && (
          <optgroup label="Reasoning (slower, better for paragraphs/features)">
            {groups.reasoning.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name} ({m.provider}){m.isFree ? " · free" : ""}
              </option>
            ))}
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
    </div>
  );
}
