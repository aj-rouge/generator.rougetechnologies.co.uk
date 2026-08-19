// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getGroqClient } from "../../utils/groq/groq-client";
import { executeQuery } from "../../utils/d1/execute";
import {
  compilePrompt,
  getPromptTemplate,
} from "../../utils/groq/prompt-utils";
import type { D1Database } from "@cloudflare/workers-types";

export const dynamic = "force-dynamic";

// --- Helper: strip reasoning tokens (safety net) ---
function stripThinkTags(text: string): string {
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return stripped || text;
}

// Type definitions
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

type TaskHandler = (payload: any, db: D1Database) => Promise<any>;

// ---------- Handlers ----------

const handleTitle = async (payload: GenerateTitleInput, db: D1Database) => {
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

  const data = {
    originalTitle,
    categoryName,
    brandLine,
    specsStr: specsStr || "none",
    keywordsStr: keywordsStr || "none",
  };

  const template = await getPromptTemplate("title", db);
  const prompt = compilePrompt(template, data);

  const result = await getGroqClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 60,
      reasoningEffort: "none",
    },
  );
  if (!result.success) throw new Error(result.error);

  let title = stripThinkTags(result.data!);
  title = title.replace(/^["']|["']$/g, "").trim();

  await storeUsage(db, "title", result);

  return { title };
};

const handleSku = async (
  payload: { title: string; condition: string },
  db: D1Database,
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
  };
  const conditionCode = conditionMap[condition] || "";

  const data = { title, condition, existingPairs, conditionCode };

  const template = await getPromptTemplate("sku", db);
  const prompt = compilePrompt(template, data);

  // First attempt
  const result = await getGroqClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.2,
      maxTokens: 30,
      reasoningEffort: "none",
    },
  );
  if (!result.success) throw new Error(result.error);

  let sku = stripThinkTags(result.data!);
  sku = sku.replace(/^["']|["']$/g, "").trim();

  // Retry if empty
  if (!sku) {
    console.warn("[handleSku] Empty response, retrying with maxTokens: 40");
    const retryResult = await getGroqClient().chatCompletion<string>(
      [{ role: "user", content: prompt }],
      {
        temperature: 0.2,
        maxTokens: 40,
        reasoningEffort: "none",
      },
    );
    if (!retryResult.success) throw new Error(retryResult.error);
    sku = stripThinkTags(retryResult.data!);
    sku = sku.replace(/^["']|["']$/g, "").trim();
  }

  if (!sku) {
    throw new Error(
      "Generated SKU is empty – please check the prompt or model response.",
    );
  }

  await storeUsage(db, "sku", result); // or retryResult if retry happened

  console.log(`[handleSku] Clean SKU: "${sku}"`);

  return { sku };
};

const handleParagraphs = async (
  payload: GenerateParagraphsInput,
  db: D1Database,
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

  const data = {
    title,
    category: category || "General",
    specsList: specsList || "none",
    featuresList: featuresList || "none",
    keywordsList: keywordsList || "none",
  };

  const template = await getPromptTemplate("paragraphs", db);
  const prompt = compilePrompt(template, data);

  const result = await getGroqClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.5,
      maxTokens: 800,
      reasoningEffort: "none",
    },
  );
  if (!result.success) throw new Error(result.error);

  let raw = stripThinkTags(result.data!);
  let paragraphs = raw
    .split(/\n\s*\n/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0)
    .slice(0, 5);

  if (paragraphs.some((p: string) => p.length < 100)) {
    throw new Error("Generated paragraphs are too short – try regenerating.");
  }

  await storeUsage(db, "paragraphs", result);

  return { paragraphs };
};

const handleFeatures = async (
  payload: GenerateFeaturesInput,
  db: D1Database,
) => {
  const { title, category, specifications, keywords } = payload;
  if (!title) throw new Error("Missing title");

  const specsList = (specifications || [])
    .map((s) => `${s.key}: ${s.value}`)
    .join("\n");
  const keywordsList = (keywords || []).join(", ");

  const data = {
    title,
    category: category || "General",
    specsList: specsList || "none",
    keywordsList: keywordsList || "none",
  };

  const template = await getPromptTemplate("features", db);
  const prompt = compilePrompt(template, data);

  const result = await getGroqClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.4,
      maxTokens: 800,
      reasoningEffort: "none",
    },
  );
  if (!result.success) throw new Error(result.error);

  const raw = stripThinkTags(result.data!);
  const lines = raw.split("\n").filter((l: string) => l.trim());
  const features = lines
    .map((line: string) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) return null;
      const fTitle = line.substring(0, colonIndex).trim();
      const fDescription = line.substring(colonIndex + 1).trim();
      return fTitle && fDescription
        ? { title: fTitle, description: fDescription }
        : null;
    })
    .filter(Boolean);
  if (features.length < 3)
    throw new Error("Generated fewer than 3 valid features");

  await storeUsage(db, "features", result);

  return { features: features.slice(0, 8) };
};

const handleNote = async (payload: GenerateNoteInput, db: D1Database) => {
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

  const data = {
    description: cleaned,
    titleLine,
    categoryLine,
  };

  const template = await getPromptTemplate("note", db);
  const prompt = compilePrompt(template, data);

  const result = await getGroqClient().chatCompletion<string>(
    [{ role: "user", content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 150,
      reasoningEffort: "none",
    },
  );
  if (!result.success) throw new Error(result.error);

  let note = stripThinkTags(result.data!);
  note = note.trim();
  if (!note || note.length < 3) note = null;

  await storeUsage(db, "note", result);

  return { note };
};

// ---------- Helper to store usage ----------
async function storeUsage(db: D1Database, task: string, result: any) {
  if (!result.usage) return;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
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
      console.error(`[API:generate] ${requestId} - Invalid request body`);
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { task, ...payload } = body as { task?: string; [key: string]: any };
    if (!task || typeof task !== "string") {
      console.error(
        `[API:generate] ${requestId} - Missing or invalid task field`,
      );
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "task" field' },
        { status: 400 },
      );
    }

    const handler = taskHandlers[task];
    if (!handler) {
      console.error(`[API:generate] ${requestId} - Unknown task: ${task}`);
      return NextResponse.json(
        { success: false, error: `Unknown task: ${task}` },
        { status: 400 },
      );
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB;

    const startTime = Date.now();
    const data = await handler(payload, db);
    const elapsed = Date.now() - startTime;

    console.log(`[API:generate] ${requestId} - Success in ${elapsed}ms`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(`[API:generate] ${requestId} - Error:`, error.message);
    if (error.stack) console.error(error.stack);
    return NextResponse.json(
      { success: false, error: error.message || "Generation failed" },
      { status: 500 },
    );
  } finally {
    console.log(`[API:generate] ${requestId} - Request finished`);
  }
}
