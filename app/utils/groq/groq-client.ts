// utils/groq/groq-client.ts

interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
  retryDelay?: number;
  stop?: string | string[];
  reasoningEffort?: "none" | "low" | "medium" | "high";
}

export interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  queue_time?: number;
  prompt_time?: number;
  completion_time?: number;
  total_time?: number;
}

export interface GroqRateLimit {
  limit: number;
  remaining: number;
  reset: number;
}

export interface GroqResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: GroqUsage;
  rateLimit?: GroqRateLimit;
}

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: GroqUsage;
}

export class GroqClient {
  private apiKey: string;
  private baseURL: string;
  private defaultModel: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = "https://api.groq.com/openai/v1";
    this.defaultModel = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";
  }

  async chatCompletion<T = string>(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: GroqOptions,
  ): Promise<GroqResponse<T>> {
    const {
      model = this.defaultModel,
      temperature = 0.5,
      maxTokens = 800,
      retries = 2,
      retryDelay = 1000,
      stop,
      reasoningEffort,
    } = options || {};

    const promptContent = messages.map((m) => m.content).join("\n");
    const promptPreview =
      promptContent.length > 200
        ? promptContent.slice(0, 200) + "..."
        : promptContent;

    console.log("[GroqClient] Request:", {
      model,
      temperature,
      maxTokens,
      stop,
      reasoningEffort,
      messagesCount: messages.length,
      promptPreview,
    });

    const startTime = Date.now();
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const requestBody: any = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        };
        if (stop) requestBody.stop = stop;

        // Only send reasoning_effort if the model is Qwen (supports "none")
        const isQwen = model.startsWith("qwen/");
        if (reasoningEffort && isQwen) {
          requestBody.reasoning_effort = reasoningEffort;
        }

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const elapsed = Date.now() - startTime;
        console.log(
          `[GroqClient] Response received in ${elapsed}ms, status: ${response.status}`,
        );

        if (!response.ok) {
          if (response.status === 429 && attempt < retries) {
            const retryAfter = parseInt(
              response.headers.get("Retry-After") || `${retryDelay}`,
            );
            console.warn(
              `[GroqClient] Rate limited, retrying after ${retryAfter}s (attempt ${attempt + 1}/${retries})`,
            );
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          const errorText = await response.text();
          console.error("[GroqClient] API error:", {
            status: response.status,
            errorText,
          });
          throw new Error(`Groq API error (${response.status}): ${errorText}`);
        }

        const data = (await response.json()) as GroqChatCompletionResponse;
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content === undefined || content === null) {
          console.error("[GroqClient] Empty response content");
          throw new Error("Empty response from Groq");
        }

        const responsePreview =
          content.length > 200 ? content.slice(0, 200) + "..." : content;
        console.log("[GroqClient] Success:", {
          responseLength: content.length,
          preview: responsePreview,
        });

        let parsed: T;
        if (
          typeof content === "string" &&
          (content.startsWith("{") || content.startsWith("["))
        ) {
          try {
            parsed = JSON.parse(content);
          } catch {
            parsed = content as unknown as T;
          }
        } else {
          parsed = content as unknown as T;
        }

        const usage = data.usage;
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
          usage,
          rateLimit,
        };
      } catch (err) {
        lastError = err as Error;
        console.error(
          `[GroqClient] Attempt ${attempt + 1} failed:`,
          lastError.message,
        );
        if (attempt < retries) {
          console.warn(
            `[GroqClient] Retry ${attempt + 1} in ${retryDelay * (attempt + 1)}ms`,
          );
          await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
        }
      }
    }

    console.error("[GroqClient] All attempts failed:", lastError?.message);
    return {
      success: false,
      error: lastError?.message || "Unknown error",
    };
  }
}

// ---------- Lazy singleton ----------
let clientInstance: GroqClient | null = null;

export function getGroqClient(): GroqClient {
  if (!clientInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }
    clientInstance = new GroqClient(apiKey);
  }
  return clientInstance;
}
