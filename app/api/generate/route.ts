// app/api/generate/route.ts
import { NextResponse } from "next/server";
import {
  buildSkuPrompt,
  buildTitlePrompt,
  buildParagraphsPrompt,
  buildFeaturesPrompt,
  buildNotePrompt,
  GenerateTitleInput,
  GenerateSkuInput,
  GenerateParagraphsInput,
  GenerateFeaturesInput,
  GenerateNoteInput,
} from "../../utils/groq/prompts";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { groqClient } from "../../utils/groq/groq-client";
import { executeQuery } from "../../utils/d1/execute";

// ---------- Task Handlers ----------
type TaskHandler = (payload: any) => Promise<any>;

// 1. Title Generation
const handleTitle = async (payload: GenerateTitleInput) => {
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
  const prompt = buildTitlePrompt({
    originalTitle,
    categoryName,
    categoryKeywords,
    specifications,
    brand,
  });
  const result = await groqClient.chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { temperature: 0.3, maxTokens: 60 },
  );
  if (!result.success) throw new Error(result.error);
  const title = result.data!.replace(/^["']|["']$/g, "").trim();
  return { title };
};

// 2. SKU Generation (needs DB access)
const handleSku = async (payload: { title: string; condition: string }) => {
  const { title, condition } = payload;
  if (!title || !condition) throw new Error("Missing title or condition");

  // Fetch existing SKUs from D1
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB;
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

  const prompt = buildSkuPrompt({ title, condition, existingPairs });
  const result = await groqClient.chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { temperature: 0.2, maxTokens: 20, stop: ["\n"] },
  );
  if (!result.success) throw new Error(result.error);
  const sku = result.data!.replace(/^["']|["']$/g, "").trim();
  return { sku };
};

// 3. Paragraphs Generation
const handleParagraphs = async (payload: GenerateParagraphsInput) => {
  const { title, category, specifications, features, keywords } = payload;
  if (!title) throw new Error("Missing title");
  const prompt = buildParagraphsPrompt({
    title,
    category,
    specifications,
    features,
    keywords,
  });
  const result = await groqClient.chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { temperature: 0.5, maxTokens: 800 },
  );
  if (!result.success) throw new Error(result.error);
  let paragraphs = result
    .data!.split(/\n\s*\n/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0)
    .slice(0, 5);
  if (paragraphs.some((p: string) => p.length < 100)) {
    throw new Error("Generated paragraphs are too short – try regenerating.");
  }
  return { paragraphs };
};

// 4. Features Generation
const handleFeatures = async (payload: GenerateFeaturesInput) => {
  const { title, category, specifications, keywords } = payload;
  if (!title) throw new Error("Missing title");
  const prompt = buildFeaturesPrompt({
    title,
    category,
    specifications,
    keywords,
  });
  const result = await groqClient.chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { temperature: 0.4, maxTokens: 800 },
  );
  if (!result.success) throw new Error(result.error);
  const lines = result.data!.split("\n").filter((l: string) => l.trim());
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
  return { features: features.slice(0, 8) };
};

// 5. Note Generation
const handleNote = async (payload: GenerateNoteInput) => {
  const { description, title, category } = payload;
  if (!description) throw new Error("Missing description");
  const cleaned = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
  if (!cleaned) return { note: null };
  const prompt = buildNotePrompt({ description: cleaned, title, category });
  const result = await groqClient.chatCompletion<string>(
    [{ role: "user", content: prompt }],
    { temperature: 0.3, maxTokens: 150 },
  );
  if (!result.success) throw new Error(result.error);
  let note = result.data!.trim();
  if (!note || note.length < 3) note = null;
  return { note };
};

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
  const requestId = Math.random().toString(36).substring(2, 10); // short unique id for tracing
  console.log(`[API:generate] ${requestId} - Request started`);

  try {
    const body = await request.json();

    // Validate that body is an object
    if (typeof body !== "object" || body === null) {
      console.error(
        `[API:generate] ${requestId} - Invalid request body:`,
        body,
      );
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Destructure safely with a type assertion
    const { task, ...payload } = body as { task?: string; [key: string]: any };

    if (!task || typeof task !== "string") {
      console.error(
        `[API:generate] ${requestId} - Missing or invalid task field:`,
        { task },
      );
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "task" field' },
        { status: 400 },
      );
    }

    // Log request details (truncate large payloads)
    const payloadKeys = Object.keys(payload);
    const payloadPreview = payloadKeys.reduce((acc, key) => {
      const value = payload[key];
      if (typeof value === "string" && value.length > 100) {
        acc[key] = value.slice(0, 100) + "...";
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    console.log(
      `[API:generate] ${requestId} - Task: ${task}, Payload keys:`,
      payloadKeys,
    );
    console.log(
      `[API:generate] ${requestId} - Payload preview:`,
      payloadPreview,
    );

    const handler = taskHandlers[task];
    if (!handler) {
      console.error(`[API:generate] ${requestId} - Unknown task: ${task}`);
      return NextResponse.json(
        { success: false, error: `Unknown task: ${task}` },
        { status: 400 },
      );
    }

    const startTime = Date.now();
    const data = await handler(payload);
    const elapsed = Date.now() - startTime;

    console.log(`[API:generate] ${requestId} - Success in ${elapsed}ms`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(`[API:generate] ${requestId} - Error:`, error.message);
    if (error.stack) {
      console.error(`[API:generate] ${requestId} - Stack trace:`, error.stack);
    }
    return NextResponse.json(
      { success: false, error: error.message || "Generation failed" },
      { status: 500 },
    );
  } finally {
    console.log(`[API:generate] ${requestId} - Request finished`);
  }
}
