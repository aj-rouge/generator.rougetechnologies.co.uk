// utils/openrouter/models.ts

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
  reasoning?: { mandatory?: boolean; default_enabled?: boolean };
}

export interface AvailableModel {
  slug: string;
  name: string;
  provider: string;
  context_length: number;
  description: string;
  isReasoningFirst: boolean;
  isFree: boolean;
  inputPricePerM: number; // USD per 1M input tokens
  outputPricePerM: number; // USD per 1M output tokens
}

interface ModelsCache {
  models: AvailableModel[];
  fetchedAt: number;
}

let cache: ModelsCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Only these are guaranteed broken / non-chat / leak reasoning. Everything
// else is allowed through.
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

// Paid frontier models — what you actually want to use once you have credits.
const PREFERRED_STANDARD: string[] = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-001",
  "anthropic/claude-3.5-haiku",
  "deepseek/deepseek-chat",
  "mistralai/mistral-small-3.1-24b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  // free fallbacks if you want them
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

function isFree(m: OpenRouterModel): boolean {
  const p = m.pricing || ({} as OpenRouterModel["pricing"]);
  return (
    (p.prompt === "0" || (p.prompt as unknown as number) === 0) &&
    (p.completion === "0" || (p.completion as unknown as number) === 0)
  );
}

function isBlocked(m: OpenRouterModel): boolean {
  return BLOCKED_PREFIXES.some((p) => m.id.startsWith(p));
}

function isTextCapable(m: OpenRouterModel): boolean {
  const arch = m.architecture;
  if (!arch) return false;
  const inputs = arch.input_modalities || [];
  const outputs = arch.output_modalities || [];
  return inputs.includes("text") && outputs.includes("text");
}

function isReasoningFirst(m: OpenRouterModel): boolean {
  const meta = m.reasoning;
  return meta?.mandatory === true || meta?.default_enabled === true;
}

function pricePerM(raw: string | number | undefined): number {
  const n = typeof raw === "string" ? parseFloat(raw) : (raw ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n * 1_000_000;
}

function toAvailable(m: OpenRouterModel): AvailableModel {
  const p = m.pricing || ({} as OpenRouterModel["pricing"]);
  return {
    slug: m.id,
    name: m.name || m.id,
    provider: (m.id || "").split("/")[0] || "unknown",
    context_length: m.context_length || 0,
    description: m.description || "",
    isReasoningFirst: isReasoningFirst(m),
    isFree: isFree(m),
    inputPricePerM: pricePerM(p.prompt),
    outputPricePerM: pricePerM(p.completion),
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

  const free = filtered.filter((m) => m.isFree).length;
  const paid = filtered.length - free;
  console.log(
    `[models] Text models: ${filtered.length} (free: ${free}, paid: ${paid}) from ${all.length} total`,
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

export function orderModelsForTask(
  available: AvailableModel[],
  wantsReasoning: boolean,
): string[] {
  const pool = available.filter((m) => m.isReasoningFirst === wantsReasoning);
  if (pool.length === 0) return available.map((m) => m.slug);

  const preferred = wantsReasoning ? PREFERRED_REASONING : PREFERRED_STANDARD;
  const ordered: string[] = [];

  for (const slug of preferred) {
    if (pool.some((m) => m.slug === slug)) ordered.push(slug);
  }
  for (const m of pool) {
    if (!ordered.includes(m.slug)) ordered.push(m.slug);
  }
  return ordered;
}
