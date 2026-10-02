// utils/openrouter/openrouter-client.ts
import { safeFindModel, type AvailableModel } from "./models";
import {
  AUTO_REASONING,
  buildReasoningPayload,
  isReasoningActive,
  reasoningHeadroom,
  reasoningTokensOf,
  visibleTokensOf,
  type ReasoningPreference,
} from "./reasoning";

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}

export interface OpenRouterRateLimit {
  limit: number;
  remaining: number;
  reset: number;
}

export interface OpenRouterResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  modelUsed?: string;
  usage?: OpenRouterUsage;
  rateLimit?: OpenRouterRateLimit;
  finishReason?: string;
  truncated?: boolean;
  /** Thinking text — kept *separate* from `data`, never mixed into it. */
  reasoning?: string;
  reasoningTokens?: number;
  visibleTokens?: number;
  generationId?: string;
}

export interface OpenRouterOptions {
  model?: string;
  models?: string[];
  temperature?: number;
  /** Visible-output budget. Reasoning headroom is added automatically. */
  maxTokens?: number;
  reasoning?: ReasoningPreference;
  /** @deprecated use `reasoning: { enabled: true, effort }` */
  reasoningEffort?: "low" | "medium" | "high";
  retries?: number;
  retryDelay?: number;
  stop?: string | string[];
  /** Abort from the caller (e.g. `request.signal` or a client disconnect). */
  signal?: AbortSignal;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatStreamHandlers {
  onQueue?: (models: string[]) => void;
  onModelStart?: (
    model: string,
    info: { index: number; total: number; reason?: string },
  ) => void;
  onReasoningDelta?: (delta: string, full: string) => void;
  onContentDelta?: (delta: string, full: string) => void;
  onUsage?: (usage: OpenRouterUsage, model: string) => void;
  onFinish?: (finishReason: string | null) => void;
}

interface StreamOnceResult {
  ok: boolean;
  error?: string;
  /** Failure happened before any token was shown → safe to try next model. */
  retryable: boolean;
  aborted?: boolean;
  reasoning: string;
  content: string;
  usage?: OpenRouterUsage;
  finishReason?: string | null;
  generationId?: string;
}

// -----------------------------------------------------------------------------
// Reasoning-leak guard
//
// Only a *fallback* for models that emit planning text straight into `content`
// with no separate reasoning channel and no  thinking tags (nex-mini et al.).
// With streaming we buffer the first ~160 chars of content so we can reject a
// leaking model before the user ever sees it.
// -----------------------------------------------------------------------------
const LEAK_GUARD_CHARS = 160;

const REASONING_LEAK_PATTERNS: RegExp[] = [
  /^\s*we\s+(need|should|must|have to)/i,
  /^\s*i\s+(need|should|must|will|have to)/i,
  /^\s*let\s+me\s+(think|plan|consider|figure|analyze)/i,
  /^\s*(ok|okay|alright)[,.]?\s+(let|we|i|need|first)/i,
  /^\s*first[, ]/i,
  /^\s*the\s+(user|prompt)\s+(wants|asks|says|requires)/i,
  /^\s*we\s+are\s+(asked|given|told)/i,
  /output\s+only\s+the/i,
  /follow\s+(exactly|the\s+instructions)/i,
  /critical\s+rules/i,
  /^\s*so,?\s+(we|i)\s+need/i,
];

function looksLikeReasoningLeak(text: string): boolean {
  return REASONING_LEAK_PATTERNS.some((re) => re.test(text.slice(0, 500)));
}

export function stripThinkTags(text: string): string {
  const stripped = text
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking[\s\S]*?<\/thinking>/gi, "")
    .trim();
  return stripped || text;
}

/**
 * Some models (R1 distills, QwQ…) put their chain of thought *inside* `content`
 * wrapped in  thinking tags. Recompute the split from the accumulated content
 * each time and let the caller emit the difference — that way partial tags
 * across chunk boundaries are handled for free.
 */
export function splitThinkTags(raw: string): {
  reasoning: string;
  content: string;
} {
  if (!/<\s*think/i.test(raw.slice(0, 600))) {
    return { reasoning: "", content: raw };
  }
  const re =
    /<\s*think(?:ing)?\s*>([\s\S]*?)(?:<\s*\/\s*think(?:ing)?\s*>|$)/gi;
  const reasoning: string[] = [];
  const content: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    content.push(raw.slice(last, m.index));
    reasoning.push(m[1]);
    last = re.lastIndex;
    // Unterminated (still streaming) → everything after this point is thinking.
    if (!/<\s*\/\s*think/i.test(m[0])) break;
  }
  content.push(raw.slice(last));

  return {
    reasoning: reasoning.join(""),
    content: content.join(""),
  };
}

/** Pull reasoning text out of a message or a stream delta. */
function extractReasoningText(part: any): string {
  if (!part) return "";
  const details = part.reasoning_details;
  if (Array.isArray(details) && details.length > 0) {
    let out = "";
    for (const d of details) {
      if (typeof d?.text === "string") out += d.text;
      else if (typeof d?.summary === "string") out += d.summary;
      // `reasoning.encrypted` carries no readable text — skip it.
    }
    if (out) return out;
  }
  if (typeof part.reasoning === "string") return part.reasoning;
  if (typeof part.reasoning_content === "string") return part.reasoning_content;
  return "";
}

const STREAM_IDLE_TIMEOUT_MS = 60_000;
const NON_STREAM_TIMEOUT_MS = 120_000;

export class OpenRouterClient {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;
  private siteUrl?: string;
  private siteName?: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = "https://openrouter.ai/api/v1";
    this.defaultModel =
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
    this.siteUrl = process.env.OPENROUTER_SITE_URL;
    this.siteName = process.env.OPENROUTER_SITE_NAME;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.siteUrl) headers["HTTP-Referer"] = this.siteUrl;
    if (this.siteName) headers["X-Title"] = this.siteName;
    return headers;
  }

  private normalizePref(options?: OpenRouterOptions): ReasoningPreference {
    if (options?.reasoning) return options.reasoning;
    if (options?.reasoningEffort) {
      return { enabled: true, effort: options.reasoningEffort };
    }
    return AUTO_REASONING;
  }

  // ---------------------------------------------------------------------------
  // Non-streaming
  // ---------------------------------------------------------------------------
  async chatCompletion<T = string>(
    messages: ChatMessage[],
    options?: OpenRouterOptions,
  ): Promise<OpenRouterResponse<T>> {
    const {
      model,
      models,
      temperature = 0.5,
      maxTokens = 800,
      retries = 1,
      retryDelay = 800,
      stop,
      signal,
    } = options || {};

    const pref = this.normalizePref(options);
    const queue = models?.length ? models : [model || this.defaultModel];
    console.log(
      `[OpenRouterClient] Queue (${queue.length}): ${queue.join(" → ")}`,
    );

    let lastError = "No models attempted";

    for (let mi = 0; mi < queue.length; mi++) {
      const currentModel = queue[mi];
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (signal?.aborted) {
          return { success: false, error: "aborted" };
        }
        try {
          const meta = await safeFindModel(currentModel);
          const result = await this.callOnce<T>(
            currentModel,
            meta,
            messages,
            { temperature, maxTokens, stop, pref },
            signal,
          );

          if (result.success) {
            const text = typeof result.data === "string" ? result.data : "";
            const hasReasoningChannel = !!result.reasoning?.trim();
            if (text && !hasReasoningChannel && looksLikeReasoningLeak(text)) {
              console.warn(
                `[OpenRouterClient] ${currentModel} leaked reasoning into content, rejecting`,
              );
              lastError = "reasoning leak detected";
              break; // no point retrying the same model
            }
            return { ...result, modelUsed: currentModel };
          }

          lastError = result.error || "unknown";
          console.warn(
            `[OpenRouterClient] ${currentModel} attempt ${attempt + 1} failed: ${lastError}`,
          );
          // 429 = upstream quota. Don't burn retries — move to the next model.
          if (lastError.includes("429") || lastError.includes("token budget")) {
            break;
          }
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, retryDelay));
          }
        } catch (err) {
          lastError = (err as Error).message;
          console.error(
            `[OpenRouterClient] ${currentModel} attempt ${attempt + 1} threw:`,
            lastError,
          );
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, retryDelay));
          }
        }
      }
      console.warn(
        `[OpenRouterClient] Model ${currentModel} exhausted, moving to next`,
      );
    }

    console.error("[OpenRouterClient] All models failed:", lastError);
    return { success: false, error: lastError };
  }

  private async callOnce<T>(
    model: string,
    meta: AvailableModel | null,
    messages: ChatMessage[],
    opts: {
      temperature: number;
      maxTokens: number;
      stop?: string | string[];
      pref: ReasoningPreference;
    },
    externalSignal?: AbortSignal,
  ): Promise<OpenRouterResponse<T>> {
    const { temperature, maxTokens, stop, pref } = opts;

    const reasoning = buildReasoningPayload(meta, pref);
    const effectiveMaxTokens = isReasoningActive(meta, pref)
      ? maxTokens + reasoningHeadroom(meta, pref)
      : maxTokens;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      NON_STREAM_TIMEOUT_MS,
    );
    const onAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", onAbort);

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: effectiveMaxTokens,
    };
    if (reasoning) requestBody.reasoning = reasoning;
    if (stop) requestBody.stop = stop;

    let response: Response;
    try {
      response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", onAbort);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `OpenRouter API error (${response.status}): ${errorText.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as any;
    if (data.error) {
      return {
        success: false,
        error: `Upstream error: ${data.error.message ?? JSON.stringify(data.error)}`,
      };
    }

    const choice = data.choices?.[0];
    const finishReason: string | undefined = choice?.finish_reason;
    const message = choice?.message;

    // Content stays content. Reasoning is NEVER used as a content fallback.
    const content = (message?.content ?? "").trim();
    const reasoningText = extractReasoningText(message).trim();
    const usage: OpenRouterUsage | undefined = data.usage;

    if (!content) {
      const reasonTokens = reasoningTokensOf(usage);
      const visible = visibleTokensOf(usage);
      if (reasonTokens > 0 && visible <= 1) {
        return {
          success: false,
          error:
            `Model spent its whole token budget thinking ` +
            `(${reasonTokens} reasoning tokens, ${visible} visible). ` +
            `Raise max_tokens or lower reasoning effort.`,
        };
      }
      return {
        success: false,
        error: `Empty response (finish_reason=${finishReason})`,
      };
    }

    if (finishReason === "length") {
      console.warn("[OpenRouterClient] Response truncated by max_tokens");
    }

    let parsed: T;
    if (content.startsWith("{") || content.startsWith("[")) {
      try {
        parsed = JSON.parse(content) as T;
      } catch {
        parsed = content as unknown as T;
      }
    } else {
      parsed = content as unknown as T;
    }

    const rateLimit: OpenRouterRateLimit = {
      limit: parseInt(
        response.headers.get("x-ratelimit-limit-requests") || "0",
      ),
      remaining: parseInt(
        response.headers.get("x-ratelimit-remaining-requests") || "0",
      ),
      reset: parseInt(
        response.headers.get("x-ratelimit-reset-requests") || "0",
      ),
    };

    return {
      success: true,
      data: parsed,
      reasoning: reasoningText || undefined,
      reasoningTokens: reasoningTokensOf(usage),
      visibleTokens: visibleTokensOf(usage),
      usage,
      rateLimit,
      finishReason,
      truncated: finishReason === "length",
      generationId: response.headers.get("x-generation-id") ?? undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Streaming
  // ---------------------------------------------------------------------------
  async chatCompletionStream(
    messages: ChatMessage[],
    options: OpenRouterOptions,
    handlers: ChatStreamHandlers = {},
  ): Promise<OpenRouterResponse<string>> {
    const {
      model,
      models,
      temperature = 0.5,
      maxTokens = 800,
      retries = 0,
      retryDelay = 500,
      stop,
      signal,
    } = options;

    const pref = this.normalizePref(options);
    const queue = models?.length ? models : [model || this.defaultModel];
    handlers.onQueue?.(queue);
    console.log(
      `[OpenRouterClient:stream] Queue (${queue.length}): ${queue.join(" → ")}`,
    );

    let lastError = "No models attempted";
    let emittedAnything = false;
    let reasoning = "";
    let content = "";
    let usage: OpenRouterUsage | undefined;
    let finishReason: string | null = null;
    let generationId: string | undefined;

    for (let mi = 0; mi < queue.length; mi++) {
      // Once the user has seen thinking or answer text we must not silently
      // swap models — that would rewrite history mid-flight.
      if (emittedAnything) break;

      const currentModel = queue[mi];
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (signal?.aborted) return { success: false, error: "aborted" };

        handlers.onModelStart?.(currentModel, {
          index: mi,
          total: queue.length,
          reason: mi > 0 ? lastError : undefined,
        });

        const meta = await safeFindModel(currentModel);
        const result = await this.streamOnce(
          currentModel,
          meta,
          messages,
          { temperature, maxTokens, stop, pref },
          {
            ...handlers,
            onReasoningDelta: (delta, full) => {
              emittedAnything = true;
              reasoning = full;
              handlers.onReasoningDelta?.(delta, full);
            },
            onContentDelta: (delta, full) => {
              emittedAnything = true;
              content = full;
              handlers.onContentDelta?.(delta, full);
            },
          },
          signal,
        );

        if (result.ok) {
          finishReason = result.finishReason ?? null;
          generationId = result.generationId;
          if (result.usage) {
            usage = result.usage;
            handlers.onUsage?.(result.usage, currentModel);
          }
          handlers.onFinish?.(finishReason);
          return {
            success: true,
            data: result.content.trim(),
            reasoning: result.reasoning.trim() || undefined,
            reasoningTokens: reasoningTokensOf(usage),
            visibleTokens: visibleTokensOf(usage),
            usage,
            modelUsed: currentModel,
            finishReason: finishReason ?? undefined,
            truncated: finishReason === "length",
            generationId,
          };
        }

        if (result.aborted || signal?.aborted) {
          return { success: false, error: "aborted" };
        }

        lastError = result.error || "unknown";
        console.warn(
          `[OpenRouterClient:stream] ${currentModel} failed: ${lastError}`,
        );
        // Never restart after tokens were shown.
        if (emittedAnything || !result.retryable) {
          return { success: false, error: lastError, reasoning };
        }
        if (!lastError.includes("429") && attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelay));
        }
      }
      console.warn(
        `[OpenRouterClient:stream] Model ${currentModel} exhausted, moving on`,
      );
    }

    return { success: false, error: lastError, reasoning };
  }

  private async streamOnce(
    model: string,
    meta: AvailableModel | null,
    messages: ChatMessage[],
    opts: {
      temperature: number;
      maxTokens: number;
      stop?: string | string[];
      pref: ReasoningPreference;
    },
    handlers: ChatStreamHandlers,
    externalSignal?: AbortSignal,
  ): Promise<StreamOnceResult> {
    const { temperature, maxTokens, stop, pref } = opts;

    const reasoningPayload = buildReasoningPayload(meta, pref);
    const effectiveMaxTokens = isReasoningActive(meta, pref)
      ? maxTokens + reasoningHeadroom(meta, pref)
      : maxTokens;

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: effectiveMaxTokens,
      stream: true,
    };
    if (reasoningPayload) requestBody.reasoning = reasoningPayload;
    if (stop) requestBody.stop = stop;

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", onAbort);

    // Idle watchdog: provider stalls (no chunk at all) are the common failure.
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, STREAM_IDLE_TIMEOUT_MS);
    };
    const disarm = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    };

    const base: StreamOnceResult = {
      ok: false,
      retryable: true,
      reasoning: "",
      content: "",
    };

    let response: Response;
    try {
      armIdle();
      response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (err) {
      disarm();
      externalSignal?.removeEventListener("abort", onAbort);
      return {
        ...base,
        error: timedOut
          ? `Stream stalled before first byte (${STREAM_IDLE_TIMEOUT_MS / 1000}s)`
          : (err as Error).message,
        retryable: !externalSignal?.aborted,
      };
    }

    if (!response.ok || !response.body) {
      disarm();
      externalSignal?.removeEventListener("abort", onAbort);
      const text = await response.text().catch(() => "");
      return {
        ...base,
        error: `OpenRouter API error (${response.status}): ${text.slice(0, 300)}`,
        retryable: response.status !== 401 && response.status !== 403,
      };
    }

    const generationId = response.headers.get("x-generation-id") ?? undefined;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Normalised channels.
    let reasoningText = "";
    let contentText = "";
    let sentReasoning = 0;
    let sentContent = 0;
    let usage: OpenRouterUsage | undefined;
    let finishReason: string | null = null;

    // Leak guard: hold back the first N chars of content until we're sure the
    // model isn't dumping its plan into the answer.
    let guardPassed = false;
    let guardBuffer = "";

    const flushContent = (force = false) => {
      const split = splitThinkTags(contentText);
      // Reasoning found inside  thinking tags is routed to the thinking channel.
      if (split.reasoning.length > sentReasoning) {
        const delta = split.reasoning.slice(sentReasoning);
        sentReasoning = split.reasoning.length;
        reasoningText = split.reasoning;
        handlers.onReasoningDelta?.(delta, reasoningText);
      }
      const visible = split.content;
      if (!guardPassed && !force) {
        if (visible.length < LEAK_GUARD_CHARS && !guardBuffer.length) {
          guardBuffer = visible;
          return;
        }
        if (!guardPassed) {
          const candidate = guardBuffer + visible;
          if (candidate.length < LEAK_GUARD_CHARS) {
            guardBuffer = candidate;
            return;
          }
          if (looksLikeReasoningLeak(candidate)) {
            guardPassed = true;
            guardBuffer = "";
            throw new LeakError();
          }
          guardPassed = true;
          guardBuffer = "";
          sentContent = candidate.length;
          handlers.onContentDelta?.(candidate, candidate);
          return;
        }
      }
      if (visible.length > sentContent) {
        const delta = visible.slice(sentContent);
        sentContent = visible.length;
        contentText = visible;
        handlers.onContentDelta?.(delta, visible);
      }
    };

    class LeakError extends Error {}

    try {
      readLoop: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armIdle();

        buffer += decoder.decode(value, { stream: true });

        let lineEnd: number;
        while ((lineEnd = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);
          // SSE comments (`: OPENROUTER PROCESSING`) are keep-alives.
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data:")) continue;

          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break readLoop;

          let chunk: any;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          if (chunk.error) {
            disarm();
            return {
              ...base,
              error: `Upstream stream error: ${chunk.error.message ?? "unknown"}`,
              reasoning: reasoningText,
              retryable: false,
            };
          }

          if (chunk.usage) usage = chunk.usage as OpenRouterUsage;

          const choice = chunk.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) finishReason = choice.finish_reason;

          const delta = choice.delta;
          if (!delta) continue;

          // Native reasoning channel (does not go through the think splitter).
          const nativeReasoning = extractReasoningText(delta);
          if (nativeReasoning) {
            guardPassed = true; // model has a real thinking channel
            sentReasoning += nativeReasoning.length;
            reasoningText += nativeReasoning;
            handlers.onReasoningDelta?.(nativeReasoning, reasoningText);
          }

          if (typeof delta.content === "string" && delta.content) {
            contentText += delta.content;
            flushContent();
          }
        }
      }
    } catch (err) {
      disarm();
      if (err instanceof LeakError) {
        return {
          ...base,
          error: "reasoning leak detected",
          retryable: true,
        };
      }
      return {
        ...base,
        error: timedOut
          ? `Stream stalled for ${STREAM_IDLE_TIMEOUT_MS / 1000}s`
          : (err as Error).message,
        reasoning: reasoningText,
        retryable: !externalSignal?.aborted,
      };
    } finally {
      disarm();
      externalSignal?.removeEventListener("abort", onAbort);
      try {
        reader.releaseLock();
      } catch {
        /* ignore */
      }
    }

    // Flush anything still held back by the leak guard.
    if (!guardPassed && (guardBuffer || contentText)) {
      const visible = guardBuffer + splitThinkTags(contentText).content;
      if (visible && looksLikeReasoningLeak(visible)) {
        return { ...base, error: "reasoning leak detected", retryable: true };
      }
      guardPassed = true;
      if (visible.length > sentContent) {
        handlers.onContentDelta?.(visible.slice(sentContent), visible);
        sentContent = visible.length;
      }
    }

    if (!contentText.trim()) {
      const reasonTokens = reasoningTokensOf(usage);
      const visible = visibleTokensOf(usage);
      if (reasonTokens > 0 && visible <= 1) {
        return {
          ok: false,
          retryable: true,
          error:
            `Model spent its whole token budget thinking ` +
            `(${reasonTokens} reasoning tokens, ${visible} visible). ` +
            `Raise max_tokens or lower reasoning effort.`,
          reasoning: reasoningText,
          content: contentText,
          usage,
        };
      }
      return {
        ok: false,
        retryable: true,
        error: `Empty response (finish_reason=${finishReason})`,
        reasoning: reasoningText,
        content: contentText,
        usage,
      };
    }

    return {
      ok: true,
      retryable: false,
      reasoning: reasoningText,
      content: contentText,
      usage,
      finishReason,
      generationId,
    };
  }
}

// ---------- Lazy singleton ----------
let clientInstance: OpenRouterClient | null = null;

export function getOpenRouterClient(): OpenRouterClient {
  if (!clientInstance) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables");
    }
    clientInstance = new OpenRouterClient(apiKey);
  }
  return clientInstance;
}
