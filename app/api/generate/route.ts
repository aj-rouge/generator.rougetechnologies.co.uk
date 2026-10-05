// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { getOpenRouterClient } from "../../utils/openrouter/openrouter-client";
import { AUTO_REASONING } from "../../utils/openrouter/reasoning";
import {
  TASKS,
  isTaskId,
  resolveModelQueue,
  storeUsage,
} from "../../utils/openrouter/tasks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 10);

  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { task, model: requestedModel, reasoning, ...input } = body as any;
    if (!isTaskId(task)) {
      return NextResponse.json(
        { success: false, error: `Unknown task: ${task}` },
        { status: 400 },
      );
    }
    const spec = TASKS[task];

    const { env } = await getCloudflareContext({ async: true });
    const db = (env as any).DB as D1Database;

    const prompt = await spec.buildPrompt(input, db);

    const resolved = await resolveModelQueue(spec.id, requestedModel);
    if (resolved.error || resolved.models.length === 0) {
      return NextResponse.json(
        { success: false, error: resolved.error || "No models available" },
        { status: 400 },
      );
    }

    const reasoningPref = {
      ...(spec.defaultReasoning ?? AUTO_REASONING),
      ...(reasoning ?? {}),
    };

    console.log(
      `[API:generate] ${requestId} - ${spec.id} queue: ${resolved.models.join(" → ")}`,
    );

    const started = Date.now();
    const result = await getOpenRouterClient().chatCompletion<string>(
      [{ role: "user", content: prompt }],
      {
        models: resolved.models,
        temperature: spec.temperature,
        stop: spec.stop,
        reasoning: reasoningPref,
        signal: request.signal,
      },
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      );
    }

    const data = spec.postProcess(result.data ?? "", input);
    if (result.modelUsed) {
      await storeUsage(db, spec.id, result.modelUsed, result);
    }

    console.log(
      `[API:generate] ${requestId} - ok in ${Date.now() - started}ms (${result.modelUsed})`,
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        model: result.modelUsed,
        reasoning: result.reasoning,
        reasoningTokens: result.reasoningTokens,
        usage: result.usage,
      },
    });
  } catch (error: any) {
    console.error(`[API:generate] ${requestId} -`, error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Generation failed" },
      { status: 500 },
    );
  }
}