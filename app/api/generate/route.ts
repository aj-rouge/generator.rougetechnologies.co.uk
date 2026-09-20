// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getOpenRouterClient } from "../../utils/openrouter/openrouter-client";
import { executeQuery } from "../../utils/d1/execute";
import {
  compilePrompt,
  getPromptTemplate,
} from "../../utils/openrouter/prompt-utils";
import {
  getModels,
  orderModelsForTask,
} from "../../utils/openrouter/models";
import type { D1Database } from "@cloudflare/workers-types";

export const dynamic = "force-dynamic";

// --- Helpers ---
function stripThinkTags(text: string): string {
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return stripped || text;
}

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,38}[A-Z0-9]$/;
function looksLikeSku(s: string): boolean {
  return SKU_PATTERN.test(s);
}

// --- Task classification ---
const REASONING_TASKS = new Set(["paragraphs", "features"]);
const SHORT_TASKS = new Set(["title", "sku", "note"]);

// --- Types ---
export interface GenerateTitleInput {
  originalTitle: string;
  categoryName: string;
  categoryKeywords: string[];
  specifications?: Array<{ key: string; value: string }>;
  brand?: string;
}
export interface GenerateSkuInput {
  title: string;
  condition: string;
}
export interface GenerateParagraphsInput {
  title: string;
  category?: string;
  specifications?: Array<{ key: string; value: string }>;
  features?: Array<{ title: string; description: string }>;
  keywords?: string[];
}
export interface GenerateFeaturesInput {
  title: string;
  category?: string;
  specifications?: Array<{ key: string; value: string }>;
  keywords?: string[];
}
export interface GenerateNoteInput {
  description: string;
  title?: string;
  category?: string;
}

interface HandlerContext {
  models: string[]; // ordered queue, primary first
  requestedModel?: string;
  requestId: string;
}

type TaskHandler = (
  payload: any,
  db: D1Database,
  ctx: HandlerContext,
) => Promise<any>;

// ---------- Handlers ----------

const handleTitle = async (
  payload: GenerateTitleInput,
  db: D1Database,
  ctx: HandlerContext,
) => {
  const {
    originalTitle,
    categoryName,
    categoryKeywords,
    specifications,
    brand,
  } = payload;
  if (!originalTitle || !categoryName) {
    throw new Error("Missing required fields: originalTitle, categoryName");
  }

  const brandLine = brand ? `**Brand**: ${brand}` : "";
  const specsStr = (specifications || [])
    .map((s) => `${s.key}: ${s.value}`)
    .join(", ");
  const keywordsStr = (categoryKeywords || []).join(", ");

  const template = await getPromptTemplate("title", db);
  const prompt = compilePrompt(template, {
    originalTitle,
    categoryName,
    brandLine,
    specsStr: specsStr || "none",
    keywordsStr: keywordsStr || "none",
  });

  const result = await getOpenRouterClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { models: ctx.models, temperature: 0.3, maxTokens: 80 },
  );
  if (!result.success) throw new Error(result.error);

  let title = stripThinkTags(result.data!);
  title = title.replace(/^["']|["']$/g, "").trim();

  await storeUsage(db, "title", result.modelUsed || ctx.models[0], result);
  return { title };
};

const handleSku = async (
  payload: { title: string; condition: string },
  db: D1Database,
  ctx: HandlerContext,
) => {
  const { title, condition } = payload;
  if (!title || !condition) throw new Error("Missing title or condition");

  const allSkus = await executeQuery(
    `SELECT sku, title FROM products WHERE sku IS NOT NULL ORDER BY updated_at DESC LIMIT 100`,
    [],
    db,
  );
  const existingPairs =
    Array.isArray(allSkus) && allSkus.length > 0
      ? allSkus
          .map((p: any) => `- SKU: ${p.sku} (Title: ${p.title})`)
          .join("\n")
      : "- No current SKU examples available.";

  const conditionMap: Record<string, string> = {
    New: "NEW",
    Used: "USE",
    "Excellent Refurbished": "EX-REF",
    "Very Good Refurbished": "VG-REF",
    "Good Refurbished": "GD-REF",
    "For parts or not working": "PARTS",
  };
  const conditionCode = conditionMap[condition] || "";

  const template = await getPromptTemplate("sku", db);
  const prompt = compilePrompt(template, {
    title,
    condition,
    existingPairs,
    conditionCode,
  });

  const result = await getOpenRouterClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { models: ctx.models, temperature: 0.2, maxTokens: 40, stop: ["\n"] },
  );
  if (!result.success) throw new Error(result.error);

  let sku = stripThinkTags(result.data!);
  sku = sku.replace(/^["']|["']$/g, "").trim();
  sku = sku
    .split(/\s+/)[0]
    .replace(/[^A-Za-z0-9-]/g, "")
    .toUpperCase();

  if (!looksLikeSku(sku)) {
    throw new Error(
      `Generated SKU is not valid ("${sku.slice(0, 60)}"). Try a different model.`,
    );
  }

  await storeUsage(db, "sku", result.modelUsed || ctx.models[0], result);
  console.log(`[handleSku] Clean SKU: "${sku}"`);
  return { sku };
};

const handleParagraphs = async (
  payload: GenerateParagraphsInput,
  db: D1Database,
  ctx: HandlerContext,
) => {
  const { title, category, specifications, features, keywords } = payload;
  if (!title) throw new Error("Missing title");

  const specsList = (specifications || [])
    .map((s) => `${s.key}: ${s.value}`)
    .join("\n");
  const featuresList = (features || [])
    .map((f) => `${f.title}: ${f.description}`)
    .join("\n");
  const keywordsList = (keywords || []).join(", ");

  const template = await getPromptTemplate("paragraphs", db);
  const prompt = compilePrompt(template, {
    title,
    category: category || "General",
    specsList: specsList || "none",
    featuresList: featuresList || "none",
    keywordsList: keywordsList || "none",
  });

  const result = await getOpenRouterClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    {
      models: ctx.models,
      temperature: 0.5,
      maxTokens: 1500,
      reasoningEffort: "low",
    },
  );
  if (!result.success) throw new Error(result.error);

  const raw = stripThinkTags(result.data!);
  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0)
    .slice(0, 5);

  if (paragraphs.some((p: string) => p.length < 100)) {
    throw new Error("Generated paragraphs are too short – try regenerating.");
  }

  await storeUsage(db, "paragraphs", result.modelUsed || ctx.models[0], result);
  return { paragraphs };
};

const handleFeatures = async (
  payload: GenerateFeaturesInput,
  db: D1Database,
  ctx: HandlerContext,
) => {
  const { title, category, specifications, keywords } = payload;
  if (!title) throw new Error("Missing title");

  const specsList = (specifications || [])
    .map((s) => `${s.key}: ${s.value}`)
    .join("\n");
  const keywordsList = (keywords || []).join(", ");

  const template = await getPromptTemplate("features", db);
  const prompt = compilePrompt(template, {
    title,
    category: category || "General",
    specsList: specsList || "none",
    keywordsList: keywordsList || "none",
  });

  const result = await getOpenRouterClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    {
      models: ctx.models,
      temperature: 0.4,
      maxTokens: 1500,
      reasoningEffort: "low",
    },
  );
  if (!result.success) throw new Error(result.error);

  const raw = stripThinkTags(result.data!);
  const lines = raw.split("\n").filter((l: string) => l.trim());
  const features = lines
    .map((line: string) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      const fTitle = line.substring(0, idx).trim();
      const fDescription = line.substring(idx + 1).trim();
      return fTitle && fDescription
        ? { title: fTitle, description: fDescription }
        : null;
    })
    .filter(Boolean);
  if (features.length < 3)
    throw new Error("Generated fewer than 3 valid features");

  await storeUsage(db, "features", result.modelUsed || ctx.models[0], result);
  return { features: features.slice(0, 8) };
};

const handleNote = async (
  payload: GenerateNoteInput,
  db: D1Database,
  ctx: HandlerContext,
) => {
  const { description, title, category } = payload;
  if (!description) throw new Error("Missing description");
  const cleaned = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
  if (!cleaned) return { note: null };

  const titleLine = title ? `**Product Title**: "${title}"` : "";
  const categoryLine = category ? `**Category**: "${category}"` : "";

  const template = await getPromptTemplate("note", db);
  const prompt = compilePrompt(template, {
    description: cleaned,
    titleLine,
    categoryLine,
  });

  const result = await getOpenRouterClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { models: ctx.models, temperature: 0.3, maxTokens: 150 },
  );
  if (!result.success) throw new Error(result.error);

  let note = stripThinkTags(result.data!);
  note = note.trim();
  if (!note || note.length < 3) note = null;

  await storeUsage(db, "note", result.modelUsed || ctx.models[0], result);
  return { note };
};

// ---------- Usage ----------
async function storeUsage(
  db: D1Database,
  task: string,
  model: string,
  result: any,
) {
  if (!result.usage) return;
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
}

// ---------- Model resolution ----------
async function resolveModels(
  task: string,
  requestedModel?: string,
): Promise<{ models: string[]; error?: string }> {
  const all = await getModels();

  if (requestedModel) {
    const found = all.find((m) => m.slug === requestedModel);
    if (!found) {
      return {
        models: [],
        error: `Model "${requestedModel}" is not allowed. Choose from /api/models.`,
      };
    }
    if (SHORT_TASKS.has(task) && found.isReasoningFirst) {
      return {
        models: [],
        error: `Model "${requestedModel}" is a reasoning model and cannot be used for "${task}".`,
      };
    }
    const sameClass = orderModelsForTask(all, found.isReasoningFirst).filter(
      (s) => s !== requestedModel,
    );
    return { models: [requestedModel, ...sameClass].slice(0, 4) };
  }

  const wantsReasoning = REASONING_TASKS.has(task);
  const queue = orderModelsForTask(all, wantsReasoning);

  if (queue.length === 0) {
    return { models: [], error: "No text models available" };
  }

  return { models: queue.slice(0, 4) };
}

// ---------- Task Registry ----------
const taskHandlers: Record<string, TaskHandler> = {
  title: handleTitle,
  sku: handleSku,
  paragraphs: handleParagraphs,
  features: handleFeatures,
  note: handleNote,
};

// ---------- POST Handler ----------
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[API:generate] ${requestId} - Request started`);

  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const {
      task,
      model: requestedModel,
      ...payload
    } = body as {
      task?: string;
      model?: string;
      [key: string]: any;
    };

    if (!task || typeof task !== "string") {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "task" field' },
        { status: 400 },
      );
    }

    const handler = taskHandlers[task];
    if (!handler) {
      return NextResponse.json(
        { success: false, error: `Unknown task: ${task}` },
        { status: 400 },
      );
    }

    const resolved = await resolveModels(task, requestedModel);
    if (resolved.error || resolved.models.length === 0) {
      console.error(
        `[API:generate] ${requestId} - ${resolved.error || "no models"}`,
      );
      return NextResponse.json(
        { success: false, error: resolved.error || "No models available" },
        { status: 400 },
      );
    }

    console.log(
      `[API:generate] ${requestId} - Queue: ${resolved.models.join(" → ")}`,
    );

    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const ctx: HandlerContext = {
      models: resolved.models,
      requestedModel,
      requestId,
    };

    const startTime = Date.now();
    const data = await handler(payload, db, ctx);
    const elapsed = Date.now() - startTime;

    console.log(`[API:generate] ${requestId} - Success in ${elapsed}ms`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(`[API:generate] ${requestId} - Error:`, error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Generation failed" },
      { status: 500 },
    );
  } finally {
    console.log(`[API:generate] ${requestId} - Request finished`);
  }
}
