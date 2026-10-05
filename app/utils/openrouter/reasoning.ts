// utils/openrouter/reasoning.ts
import type { AvailableModel } from "./models";

/** Effort levels accepted by OpenRouter's unified `reasoning.effort`. */
export type ReasoningEffort =
  | "max"
  | "xhigh"
  | "high"
  | "medium"
  | "low"
  | "minimal"
  | "none";

export const ALL_EFFORTS: ReasoningEffort[] = [
  "max",
  "xhigh",
  "high",
  "medium",
  "low",
  "minimal",
  "none",
];

/** Descending effort order — used to pick the closest *allowed* level. */
export const EFFORT_RANK: Record<ReasoningEffort, number> = {
  none: 0,
  minimal: 1,
  low: 2,
  medium: 3,
  high: 4,
  xhigh: 5,
  max: 6,
};

export const EFFORT_LABEL: Record<ReasoningEffort, string> = {
  max: "Max",
  xhigh: "Extra high",
  high: "High",
  medium: "Medium",
  low: "Low",
  minimal: "Minimal",
  none: "Off",
};

/**
 * What the user wants. `enabled: "auto"` → leave the model's own default alone
 * (which is what most people mean). Effort/budget are only sent when the model
 * advertises support for them.
 */
export interface ReasoningPreference {
  enabled: boolean | "auto";
  effort?: ReasoningEffort;
  /** Hard cap on thinking tokens — only sent when `supportsReasoningMaxTokens`. */
  maxTokens?: number;
}

export const AUTO_REASONING: ReasoningPreference = { enabled: "auto" };

export interface ReasoningPayload {
  enabled?: boolean;
  effort?: ReasoningEffort;
  max_tokens?: number;
  exclude?: boolean;
}

export function modelSupportsReasoning(model?: AvailableModel | null): boolean {
  return !!model?.supportsReasoning;
}

function isThinker(m: AvailableModel): boolean {
  return m.reasoningMandatory || m.reasoningByDefault;
}

/** Clamp a requested effort to what this model actually accepts. */
export function clampEffort(
  requested: ReasoningEffort | undefined,
  supported: ReasoningEffort[] | null | undefined,
  fallback?: ReasoningEffort,
): ReasoningEffort | undefined {
  const wanted = requested ?? fallback;
  if (!wanted) return undefined;
  // `null`/empty means "no allowlist — any gateway effort is accepted".
  if (!supported || supported.length === 0) return wanted;
  if (supported.includes(wanted)) return wanted;
  const target = EFFORT_RANK[wanted];
  return supported.reduce(
    (best, e) =>
      Math.abs(EFFORT_RANK[e] - target) < Math.abs(EFFORT_RANK[best] - target)
        ? e
        : best,
    supported[0],
  );
}

/**
 * Build the `reasoning` object for one specific model.
 * Returns `null` when the field must be omitted entirely (the model has no
 * reasoning channel) — sending it to a non-reasoning model is at best noise.
 */
export function buildReasoningPayload(
  model: AvailableModel | null | undefined,
  pref: ReasoningPreference = AUTO_REASONING,
): ReasoningPayload | null {
  if (!modelSupportsReasoning(model)) return null;
  const m = model as AvailableModel;

  // Mandatory thinking: never ask for it to be disabled, and `effort: "none"`
  // is explicitly rejected by these models.
  if (m.reasoningMandatory) {
    const payload: ReasoningPayload = { enabled: true, exclude: false };
    const effort = clampEffort(
      pref.effort,
      m.reasoningSupportedEfforts,
      m.reasoningDefaultEffort,
    );
    if (effort && effort !== "none") payload.effort = effort;
    return payload;
  }

  const on = pref.enabled === "auto" ? m.reasoningByDefault : pref.enabled;
  if (!on) return { enabled: false };

  // `exclude: false` is the default, but we set it explicitly: we *want* the
  // thinking text so the UI can show it.
  const payload: ReasoningPayload = { enabled: true, exclude: false };

  if (pref.maxTokens && m.supportsReasoningMaxTokens) {
    // effort and max_tokens are mutually exclusive on OpenRouter.
    payload.max_tokens = pref.maxTokens;
  } else {
    const effort = clampEffort(
      pref.effort,
      m.reasoningSupportedEfforts,
      m.reasoningDefaultEffort,
    );
    if (effort && effort !== "none") payload.effort = effort;
  }
  return payload;
}

/** Will this request actually produce thinking tokens? (UI + budget maths) */
export function isReasoningActive(
  model: AvailableModel | null | undefined,
  pref: ReasoningPreference = AUTO_REASONING,
): boolean {
  if (!modelSupportsReasoning(model)) return false;
  const m = model as AvailableModel;
  if (m.reasoningMandatory) return true;
  return pref.enabled === "auto" ? m.reasoningByDefault : pref.enabled === true;
}

/**
 * Extra output tokens to add on top of the visible budget.
 *
 * Reasoning tokens count against `max_tokens` on most providers, so a small
 * visible budget will be entirely consumed by thinking. These are *guard rails*,
 * not targets: the real protection is the "visible tokens === 0" check in the
 * client, which re-queues the next model instead of saving garbage.
 *
 * Not used when no `maxTokens` is passed to the client — in that case the
 * provider/model default applies and there is no budget to top up.
 */
const HEADROOM_BY_EFFORT: Record<ReasoningEffort, number> = {
  max: 12000,
  xhigh: 12000,
  high: 8000,
  medium: 4000,
  low: 1500,
  minimal: 600,
  none: 0,
};

export function reasoningHeadroom(
  model: AvailableModel | null | undefined,
  pref: ReasoningPreference = AUTO_REASONING,
): number {
  if (!isReasoningActive(model, pref)) return 0;
  const m = model as AvailableModel;
  if (pref.maxTokens && m.supportsReasoningMaxTokens) {
    // The provider enforces the cap itself; still give the answer room.
    return Math.min(pref.maxTokens, 32000);
  }
  const effort =
    clampEffort(
      pref.effort,
      m.reasoningSupportedEfforts,
      m.reasoningDefaultEffort,
    ) ?? "medium";
  return HEADROOM_BY_EFFORT[effort] ?? 4000;
}

/** Human-readable summary for chips/tooltips. */
export function describeReasoning(
  model: AvailableModel | null | undefined,
  pref: ReasoningPreference = AUTO_REASONING,
): string {
  if (!modelSupportsReasoning(model)) return "No thinking channel";
  const m = model as AvailableModel;
  if (!isReasoningActive(model, pref)) return "Thinking off";
  if (m.reasoningMandatory) return "Always thinks";
  const effort = clampEffort(
    pref.effort,
    m.reasoningSupportedEfforts,
    m.reasoningDefaultEffort,
  );
  return effort
    ? `Thinking · ${EFFORT_LABEL[effort]}`
    : "Thinking · model default";
}

export function reasoningTokensOf(usage?: {
  completion_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}): number {
  return usage?.completion_tokens_details?.reasoning_tokens ?? 0;
}

/** Visible (non-thinking) tokens actually produced. */
export function visibleTokensOf(usage?: {
  completion_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}): number {
  const total = usage?.completion_tokens ?? 0;
  return Math.max(0, total - reasoningTokensOf(usage));
}
