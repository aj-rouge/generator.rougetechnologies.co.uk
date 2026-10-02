// utils/openrouter/models.ts
import type { ReasoningEffort } from "./reasoning";

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  supported_parameters: string[];
  /** Present only for models that expose a thinking channel. */
  reasoning?: {
    mandatory?: boolean;
    default_enabled?: boolean;
    default_effort?: ReasoningEffort;
    /** null / omitted → no allowlist, any effort is accepted. */
    supported_efforts?: ReasoningEffort[] | null;
    supports_max_tokens?: boolean;
  };
}

export interface AvailableModel {
  slug: string;
  name: string;
  provider: string;
  context_length: number;
  description: string;
  isFree: boolean;
  inputPricePerM: number;
  outputPricePerM: number;

  // --- reasoning capabilities ---
  /** Model exposes a thinking channel at all. */
  supportsReasoning: boolean;
  /** Thinks unless you explicitly turn it off. */
  reasoningByDefault: boolean;
  /** Cannot be turned off (`effort: "none"` is rejected). */
  reasoningMandatory: boolean;
  reasoningDefaultEffort?: ReasoningEffort;
  /** `null` → all efforts accepted. */
  reasoningSupportedEfforts?: ReasoningEffort[] | null;
  supportsReasoningMaxTokens: boolean;

  inputModalities: string[];
  outputModalities: string[];

  /** @deprecated alias of `reasoningByDefault`, kept for existing callers. */
  isReasoningFirst: boolean;
}

export function isThinker(m: AvailableModel): boolean {
  return m.reasoningMandatory || m.reasoningByDefault;
}

interface ModelsCache {
  models: AvailableModel[];
  fetchedAt: number;
}

let cache: ModelsCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

const BLOCKED_PREFIXES: string[] = [
  "openrouter/",
  "google/lyria",
  "google/imagen",
  "google/gemini-2.5-flash-image",
  "black-forest-labs/",
  "stabilityai/stable-diffusion",
  "stabilityai/stable-audio",
  "openai/dall-e",
  "openai/whisper",
  "openai/gpt-image",
  "openai/tts",
  "meta-llama/llama-guard",
  "meta-llama/llama-prompt-guard",
  "mistralai/mistral-embed",
  "thenlper/gte-",
  "baai/bge-",
  "sentence-transformers/",
  "nvidia/llama-3.1-nemoguard",
  "qwen/qwen-2.5-coder-",
  "cohere/north-mini-code",
  "dots-studio/dots-3-note",
  "nex-agi/",
];

/**
 * Ordering hints only — these are *not* an allowlist any more. Stale slugs are
 * harmless (they simply don't match), and every non-blocked text model is
 * selectable by the user.
 */
const PREFERRED_STANDARD: string[] = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "anthropic/claude-3.5-haiku",
  "deepseek/deepseek-chat",
  "mistralai/mistral-small-3.1-24b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
];

const PREFERRED_REASONING: string[] = [
  "openai/o4-mini",
  "deepseek/deepseek-r1",
  "anthropic/claude-3.7-sonnet",
  "google/gemini-2.5-flash",
  "deepseek/deepseek-r1-0528:free",
  "qwen/qwen3-235b-a22b:free",
];

function numeric(v: string | number | undefined): number {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isFree(m: OpenRouterModel): boolean {
  const p = m.pricing || ({} as OpenRouterModel["pricing"]);
  return numeric(p.prompt) === 0 && numeric(p.completion) === 0;
}

function isBlocked(m: OpenRouterModel): boolean {
  return BLOCKED_PREFIXES.some((p) => (m.id ?? "").startsWith(p));
}

function isTextCapable(m: OpenRouterModel): boolean {
  const arch = m.architecture;
  const inputs = arch?.input_modalities ?? [];
  const outputs = arch?.output_modalities ?? [];
  if (inputs.length === 0 && outputs.length === 0) {
    // Missing modality metadata: fall back to "does it advertise chat params".
    return (m.supported_parameters ?? []).some((p) =>
      ["temperature", "max_tokens", "tools", "reasoning"].includes(p),
    );
  }
  return inputs.includes("text") && outputs.includes("text");
}

function pricePerM(raw: string | number | undefined): number {
  return numeric(raw) * 1_000_000;
}

function toAvailable(m: OpenRouterModel): AvailableModel {
  const p = m.pricing || ({} as OpenRouterModel["pricing"]);
  const r = m.reasoning;
  const supportsReasoning = !!r;
  return {
    slug: m.id,
    name: m.name || m.id,
    provider: (m.id || "").split("/")[0] || "unknown",
    context_length: m.context_length || 0,
    description: m.description || "",
    isFree: isFree(m),
    inputPricePerM: pricePerM(p.prompt),
    outputPricePerM: pricePerM(p.completion),

    supportsReasoning,
    reasoningByDefault: r?.default_enabled === true,
    reasoningMandatory: r?.mandatory === true,
    reasoningDefaultEffort: r?.default_effort,
    reasoningSupportedEfforts: r?.supported_efforts ?? null,
    supportsReasoningMaxTokens: r?.supports_max_tokens === true,

    inputModalities: m.architecture?.input_modalities ?? [],
    outputModalities: m.architecture?.output_modalities ?? [],

    isReasoningFirst: r?.default_enabled === true,
  };
}

export async function getModels(): Promise<AvailableModel[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.models;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);

  const json = (await res.json()) as { data?: OpenRouterModel[] };
  const all = json.data || [];

  const filtered = all
    .filter((m) => !isBlocked(m) && isTextCapable(m))
    .map(toAvailable)
    .sort((a, b) => a.name.localeCompare(b.name));

  const thinkers = filtered.filter(isThinker).length;
  console.log(
    `[models] Text models: ${filtered.length} ` +
      `(thinking-by-default: ${thinkers}, free: ${filtered.filter((m) => m.isFree).length}) ` +
      `from ${all.length} total`,
  );

  cache = { models: filtered, fetchedAt: Date.now() };
  return filtered;
}

export async function isAllowedModel(slug: string): Promise<boolean> {
  const models = await getModels();
  return models.some((m) => m.slug === slug);
}

export async function findModel(slug: string): Promise<AvailableModel | null> {
  const models = await getModels();
  return models.find((m) => m.slug === slug) || null;
}

/** Like `findModel`, but never throws (safe inside a streaming loop). */
export async function safeFindModel(
  slug: string,
): Promise<AvailableModel | null> {
  try {
    return await findModel(slug);
  } catch {
    return null;
  }
}

export interface ModelGroups {
  /** Always thinks (mandatory or default_enabled). */
  reasoningByDefault: AvailableModel[];
  /** Has a thinking channel, but off unless you ask for it. */
  reasoningCapable: AvailableModel[];
  standard: AvailableModel[];
  counts: {
    total: number;
    reasoningByDefault: number;
    reasoningCapable: number;
    standard: number;
    free: number;
  };
}

export function groupModels(models: AvailableModel[]): ModelGroups {
  const reasoningByDefault: AvailableModel[] = [];
  const reasoningCapable: AvailableModel[] = [];
  const standard: AvailableModel[] = [];

  for (const m of models) {
    if (isThinker(m)) reasoningByDefault.push(m);
    else if (m.supportsReasoning) reasoningCapable.push(m);
    else standard.push(m);
  }

  return {
    reasoningByDefault,
    reasoningCapable,
    standard,
    counts: {
      total: models.length,
      reasoningByDefault: reasoningByDefault.length,
      reasoningCapable: reasoningCapable.length,
      standard: standard.length,
      free: models.filter((m) => m.isFree).length,
    },
  };
}

/**
 * Fallback queue when the caller didn't pin a model. `wantsReasoning` is now
 * only a *sorting* preference — it never gates anything.
 */
export function orderModelsForTask(
  available: AvailableModel[],
  wantsReasoning: boolean,
): string[] {
  const pool = available.filter((m) => isThinker(m) === wantsReasoning);
  const usable = pool.length > 0 ? pool : available;

  const preferred = wantsReasoning ? PREFERRED_REASONING : PREFERRED_STANDARD;
  const ordered: string[] = [];
  for (const slug of preferred) {
    if (usable.some((m) => m.slug === slug)) ordered.push(slug);
  }
  // Free models first among the remainder — cheapest failure mode.
  const rest = usable
    .filter((m) => !ordered.includes(m.slug))
    .sort((a, b) => Number(b.isFree) - Number(a.isFree));
  for (const m of rest) ordered.push(m.slug);
  return ordered;
}
