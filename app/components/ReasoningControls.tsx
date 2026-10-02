// app/components/ReasoningControls.tsx
"use client";
import { Brain } from "lucide-react";
import { useEffect } from "react";
import {
  ALL_EFFORTS,
  EFFORT_LABEL,
  type ReasoningEffort,
  type ReasoningPreference,
} from "../utils/openrouter/reasoning";
import { useModels } from "./ModelPicker";

interface ReasoningControlsProps {
  slug: string;
  value: ReasoningPreference;
  onChange: (next: ReasoningPreference) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export function ReasoningControls({
  slug,
  value,
  onChange,
  disabled = false,
  compact = true,
  className = "",
}: ReasoningControlsProps) {
  const { lookup } = useModels();
  const model = slug ? lookup(slug) : null;

  // Nothing to control: silently hide so the UI stays clean.
  if (!model?.supportsReasoning) return null;

  const mandatory = model.reasoningMandatory;
  const active =
    mandatory ||
    (value.enabled === "auto" ? model.reasoningByDefault : value.enabled);

  const efforts: ReasoningEffort[] =
    model.reasoningSupportedEfforts &&
    model.reasoningSupportedEfforts.length > 0
      ? model.reasoningSupportedEfforts
      : ALL_EFFORTS;

  const set = (patch: Partial<ReasoningPreference>) =>
    onChange({ ...value, ...patch });

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={
        mandatory
          ? "This model always reasons — effort can be tuned but not disabled."
          : "Reasoning is optional. It costs tokens and time."
      }
    >
      <Brain
        className={`w-3.5 h-3.5 ${active ? "text-purple-500" : "text-gray-400"}`}
      />

      {mandatory ? (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          always on
        </span>
      ) : (
        <select
          value={
            value.enabled === "auto" ? "auto" : value.enabled ? "on" : "off"
          }
          disabled={disabled}
          onChange={(e) =>
            set({
              enabled:
                e.target.value === "auto" ? "auto" : e.target.value === "on",
            })
          }
          className="text-[11px] border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="auto">Thinking: model default</option>
          <option value="on">Thinking: on</option>
          <option value="off">Thinking: off</option>
        </select>
      )}

      {active && !compact && (
        <select
          value={value.effort ?? ""}
          disabled={disabled}
          onChange={(e) =>
            set({
              effort: (e.target.value || undefined) as
                | ReasoningEffort
                | undefined,
            })
          }
          className="text-[11px] border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">effort: default</option>
          {efforts
            .filter((e) => e !== "none")
            .map((e) => (
              <option key={e} value={e}>
                effort: {EFFORT_LABEL[e]}
              </option>
            ))}
        </select>
      )}

      {active && model.supportsReasoningMaxTokens && !compact && (
        <input
          type="number"
          min={1024}
          step={512}
          placeholder="think tokens"
          disabled={disabled}
          value={value.maxTokens ?? ""}
          onChange={(e) =>
            set({
              maxTokens: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-24 text-[11px] border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      )}
    </div>
  );
}
