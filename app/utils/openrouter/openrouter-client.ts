// utils/openrouter/openrouter-client.ts

interface OpenRouterOptions {
  model?: string;
  models?: string[];
  temperature?: number;
  maxTokens?: number;
  retries?: number;
  retryDelay?: number;
  stop?: string | string[];
  reasoningEffort?: "low" | "medium" | "high";
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
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
}

interface OpenRouterChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning?: string | null;
      reasoning_content?: string | null;
    };
    finish_reason?: string;
  }>;
  usage?: OpenRouterUsage;
  error?: { message?: string; code?: number };
}

// -----------------------------------------------------------------------------
// Reasoning-leak detection
//
// Some models (nex-mini, some R1 distills, etc.) don't wrap their chain of
// thought in <think> tags — they just emit planning text directly into
// `content`. The output looks like "We need answer only description...",
// "Let me think...", "Output ONLY the...", or a verbatim echo of the prompt
// instructions. Detecting this is how we avoid saving garbage.
// -----------------------------------------------------------------------------
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
  const head = text.slice(0, 500);
  return REASONING_LEAK_PATTERNS.some((re) => re.test(head));
}

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

  async chatCompletion<T = string>(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
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
      reasoningEffort,
    } = options || {};

    const queue: string[] =
      models && models.length > 0 ? models : [model || this.defaultModel];

    console.log(
      `[OpenRouterClient] Request queue (${queue.length}): ${queue.join(" → ")}`,
    );

    let lastError = "No models attempted";

    for (let mi = 0; mi < queue.length; mi++) {
      const currentModel = queue[mi];
      console.log(
        `[OpenRouterClient] Trying model ${mi + 1}/${queue.length}: ${currentModel}`,
      );

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await this.callOnce<T>(currentModel, messages, {
            temperature,
            maxTokens,
            stop,
            reasoningEffort,
          });

          if (result.success) {
            // Guard: reasoning models leak planning text into `content`.
            const text = typeof result.data === "string" ? result.data : "";
            if (text && looksLikeReasoningLeak(text)) {
              console.warn(
                `[OpenRouterClient] ${currentModel} leaked reasoning into content, rejecting`,
              );
              lastError = "reasoning leak detected";
              break; // no point retrying the same model; move to next
            }
            return { ...result, modelUsed: currentModel };
          }

          lastError = result.error || "unknown";
          console.warn(
            `[OpenRouterClient] ${currentModel} attempt ${attempt + 1} failed: ${lastError}`,
          );

          // 429 = upstream quota exhausted. Don't retry — jump to next model.
          if (lastError.includes("429")) {
            console.warn(
              `[OpenRouterClient] ${currentModel} rate-limited, skipping retries`,
            );
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
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    opts: {
      temperature: number;
      maxTokens: number;
      stop?: string | string[];
      reasoningEffort?: "low" | "medium" | "high";
    },
  ): Promise<OpenRouterResponse<T>> {
    const { temperature, maxTokens, stop, reasoningEffort } = opts;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      reasoning: reasoningEffort
        ? { effort: reasoningEffort }
        : { enabled: false },
    };
    if (stop) requestBody.stop = stop;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.siteUrl) headers["HTTP-Referer"] = this.siteUrl;
    if (this.siteName) headers["X-Title"] = this.siteName;

    let response: Response;
    try {
      response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `OpenRouter API error (${response.status}): ${errorText.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as OpenRouterChatCompletionResponse;

    if (data.error) {
      return {
        success: false,
        error: `Upstream error: ${data.error.message ?? JSON.stringify(data.error)}`,
      };
    }

    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason;
    const message = choice?.message;

    // Prefer `content`. Fall back to reasoning only when content is truly empty.
    const rawContent =
      (message?.content && message.content.trim()) ||
      message?.reasoning ||
      message?.reasoning_content ||
      "";
    const content = rawContent.trim();

    if (!content) {
      console.error("[OpenRouterClient] Empty content. Body:", {
        finishReason,
        messageKeys: message ? Object.keys(message) : [],
        usage: data.usage,
      });
      return {
        success: false,
        error: `Empty response (finish_reason=${finishReason})`,
      };
    }

    if (finishReason === "length") {
      console.warn("[OpenRouterClient] Response truncated by max_tokens");
    }

    console.log("[OpenRouterClient] Success:", {
      responseLength: content.length,
      preview: content.slice(0, 200),
    });

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

    const rateLimit = {
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
      usage: data.usage,
      rateLimit,
      finishReason,
      truncated: finishReason === "length",
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
