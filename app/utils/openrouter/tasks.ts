// utils/openrouter/tasks.ts
import type { D1Database } from "@cloudflare/workers-types";
import { executeQuery } from "../d1/execute";
import { compilePrompt, getPromptTemplate } from "./prompt-utils";
import { getModels, orderModelsForTask, type AvailableModel } from "./models";
import { AUTO_REASONING, type ReasoningPreference } from "./reasoning";
import { stripThinkTags } from "./openrouter-client";

export type TaskId = "title" | "sku" | "paragraphs" | "features" | "note";

export interface TaskSpec<TIn = any, TOut = any> {
  id: TaskId;
  label: string;
  temperature: number;
  /** Visible-output budget; reasoning headroom is added on top. */
  maxTokens: number;
  stop?: string[];
  /** Merely the UI default — the user can override per request. */
  defaultReasoning: ReasoningPreference;
  buildPrompt: (input: TIn, db: D1Database) => Promise<string>;
  /** Validates + shapes the final text. Throws to reject the result. */
  postProcess: (raw: string, input: TIn) => TOut;
}

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,38}[A-Z0-9]$/;

/** Models occasionally wrap text in quotes or a JSON string. */
export function unwrapModelText(raw: string): string {
  let text = stripThinkTags(raw).trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1);
  }
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      if (typeof json === "string") return json.trim();
      if (typeof json === "object" && json !== null) {
        const first = Object.values(json)[0];
        if (typeof first === "string") return first.trim();
      }
    } catch {
      /* not JSON — keep the raw text */
    }
  }
  return trimmed;
}

const CONDITION_CODES: Record<string, string> = {
  New: "NEW",
  Used: "USE",
  "Excellent Refurbished": "EX-REF",
  "Very Good Refurbished": "VG-REF",
  "Good Refurbished": "GD-REF",
  "For parts or not working": "PARTS",
};

// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------
export const TASKS: Record<TaskId, TaskSpec> = {
  title: {
    id: "title",
    label: "Title",
    temperature: 0.3,
    maxTokens: 120,
    defaultReasoning: { enabled: "auto" },
    async buildPrompt(input: any, db) {
      if (!input.originalTitle || !input.categoryName) {
        throw new Error("Missing required fields: originalTitle, categoryName");
      }
      const specsStr = (input.specifications ?? [])
        .map((s: any) => `${s.key}: ${s.value}`)
        .join(", ");
      const template = await getPromptTemplate("title", db);
      return compilePrompt(template, {
        originalTitle: input.originalTitle,
        categoryName: input.categoryName,
        brandLine: input.brand ? `**Brand**: ${input.brand}` : "",
        specsStr: specsStr || "none",
        keywordsStr: (input.categoryKeywords ?? []).join(", ") || "none",
      });
    },
    postProcess(raw) {
      const title = unwrapModelText(raw).replace(/\s+/g, " ").trim();
      if (title.length < 10) {
        throw new Error("Generated title is too short – try another model.");
      }
      return { title };
    },
  },

  sku: {
    id: "sku",
    label: "SKU",
    temperature: 0.2,
    maxTokens: 60,
    stop: ["\n"],
    defaultReasoning: { enabled: "auto" },
    async buildPrompt(input: any, db) {
      if (!input.title || !input.condition) {
        throw new Error("Missing title or condition");
      }
      const rows = await executeQuery(
        `SELECT sku, title FROM products
         WHERE sku IS NOT NULL ORDER BY updated_at DESC LIMIT 100`,
        [],
        db,
      );
      const existingPairs =
        Array.isArray(rows) && rows.length > 0
          ? rows
              .map((p: any) => `- SKU: ${p.sku} (Title: ${p.title})`)
              .join("\n")
          : "- No current SKU examples available.";

      const template = await getPromptTemplate("sku", db);
      return compilePrompt(template, {
        title: input.title,
        condition: input.condition,
        existingPairs,
        conditionCode: CONDITION_CODES[input.condition] ?? "",
      });
    },
    postProcess(raw) {
      const sku = unwrapModelText(raw)
        .split(/\s+/)[0]
        .replace(/[^A-Za-z0-9-]/g, "")
        .toUpperCase();
      if (!SKU_PATTERN.test(sku)) {
        throw new Error(
          `Generated SKU is not valid ("${sku.slice(0, 60)}"). Try a different model.`,
        );
      }
      return { sku };
    },
  },

  paragraphs: {
    id: "paragraphs",
    label: "Description paragraphs",
    temperature: 0.5,
    maxTokens: 1500,
    defaultReasoning: { enabled: true, effort: "low" },
    async buildPrompt(input: any, db) {
      if (!input.title) throw new Error("Missing title");
      const template = await getPromptTemplate("paragraphs", db);
      return compilePrompt(template, {
        title: input.title,
        category: input.category || "General",
        specsList:
          (input.specifications ?? [])
            .map((s: any) => `${s.key}: ${s.value}`)
            .join("\n") || "none",
        featuresList:
          (input.features ?? [])
            .map((f: any) => `${f.title}: ${f.description}`)
            .join("\n") || "none",
        keywordsList: (input.keywords ?? []).join(", ") || "none",
      });
    },
    postProcess(raw) {
      const paragraphs = unwrapModelText(raw)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (paragraphs.length === 0) {
        throw new Error("Model returned no usable paragraphs.");
      }
      if (paragraphs.some((p) => p.length < 100)) {
        throw new Error("Generated paragraphs are too short – try again.");
      }
      return { paragraphs: paragraphs.slice(0, 5) };
    },
  },

  features: {
    id: "features",
    label: "Key features",
    temperature: 0.4,
    maxTokens: 1500,
    defaultReasoning: { enabled: true, effort: "low" },
    async buildPrompt(input: any, db) {
      if (!input.title) throw new Error("Missing title");
      const template = await getPromptTemplate("features", db);
      return compilePrompt(template, {
        title: input.title,
        category: input.category || "General",
        specsList:
          (input.specifications ?? [])
            .map((s: any) => `${s.key}: ${s.value}`)
            .join("\n") || "none",
        keywordsList: (input.keywords ?? []).join(", ") || "none",
      });
    },
    postProcess(raw) {
      const features = unwrapModelText(raw)
        .split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const idx = line.indexOf(":");
          if (idx === -1) return null;
          const title = line.substring(0, idx).trim();
          const description = line.substring(idx + 1).trim();
          return title && description ? { title, description } : null;
        })
        .filter(Boolean) as Array<{ title: string; description: string }>;
      if (features.length < 3) {
        throw new Error("Generated fewer than 3 valid features");
      }
      return { features: features.slice(0, 8) };
    },
  },

  note: {
    id: "note",
    label: "Condition note",
    temperature: 0.3,
    maxTokens: 200,
    defaultReasoning: { enabled: "auto" },
    async buildPrompt(input: any, db) {
      const cleaned = String(input.description ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2000);
      if (!cleaned) throw new Error("Missing description");
      const template = await getPromptTemplate("note", db);
      return compilePrompt(template, {
        description: cleaned,
        titleLine: input.title ? `**Product Title**: "${input.title}"` : "",
        categoryLine: input.category ? `**Category**: "${input.category}"` : "",
      });
    },
    postProcess(raw) {
      const note = unwrapModelText(raw).trim();
      return { note: note.length >= 3 ? note : null };
    },
  },
};

export function isTaskId(value: unknown): value is TaskId {
  return typeof value === "string" && value in TASKS;
}

/**
 * Build the model queue for a request.
 *
 * Every non-blocked text model is allowed for every task now — including
 * thinking models for `title`/`sku`/`note`. If a model is unsuitable the user
 * finds out from the result and can switch, which is the intended trade-off.
 */
export async function resolveModelQueue(
  task: TaskId,
  requestedModel?: string,
): Promise<{ models: string[]; error?: string }> {
  const all: AvailableModel[] = await getModels();

  if (requestedModel) {
    const found = all.find((m) => m.slug === requestedModel);
    if (!found) {
      return {
        models: [],
        error: `Model "${requestedModel}" is not allowed. Choose from /api/models.`,
      };
    }
    const fallbacks = orderModelsForTask(all, found.reasoningByDefault)
      .filter((s) => s !== requestedModel)
      .slice(0, 3);
    return { models: [requestedModel, ...fallbacks].slice(0, 4) };
  }

  const wantsReasoning = TASKS[task].defaultReasoning.enabled !== false;
  const queue = orderModelsForTask(all, wantsReasoning);
  if (queue.length === 0)
    return { models: [], error: "No text models available" };
  return { models: queue.slice(0, 4) };
}

// ---------------------------------------------------------------------------
// Usage logging (shared by both routes)
// ---------------------------------------------------------------------------
export async function storeUsage(
  db: D1Database,
  task: string,
  model: string,
  result: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    rateLimit?: { remaining?: number; reset?: number };
  },
): Promise<void> {
  if (!result.usage) return;
  try {
    await executeQuery(
      `INSERT INTO usage_logs
       (task, model, prompt_tokens, completion_tokens, total_tokens,
        request_timestamp, rate_limit_remaining, rate_limit_reset)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task,
        model,
        result.usage.prompt_tokens || 0,
        result.usage.completion_tokens || 0,
        result.usage.total_tokens || 0,
        Date.now(),
        result.rateLimit?.remaining || 0,
        result.rateLimit?.reset || 0,
      ],
      db,
    );
  } catch (err) {
    // Logging must never fail a generation.
    console.error("[storeUsage] failed:", (err as Error).message);
  }
}
