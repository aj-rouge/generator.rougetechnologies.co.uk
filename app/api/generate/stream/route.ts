// app/api/generate/stream/route.ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { getOpenRouterClient } from "../../../utils/openrouter/openrouter-client";
import {
  AUTO_REASONING,
  type ReasoningPreference,
} from "../../../utils/openrouter/reasoning";
import {
  TASKS,
  isTaskId,
  resolveModelQueue,
  storeUsage,
} from "../../../utils/openrouter/tasks";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Tell Cloudflare / nginx not to buffer the stream.
  "X-Accel-Buffering": "no",
};

function frame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).slice(2, 10);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (typeof body !== "object" || body === null) {
    return badRequest("Invalid request body");
  }

  const {
    task,
    model: requestedModel,
    reasoning,
    ...input
  } = body as {
    task?: string;
    model?: string;
    reasoning?: ReasoningPreference;
    [key: string]: unknown;
  };

  if (!isTaskId(task)) return badRequest(`Unknown task: ${task}`);
  const spec = TASKS[task];

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as any).DB as D1Database;

  // Fail fast, before we commit to a 200 SSE response.
  let prompt: string;
  try {
    prompt = await spec.buildPrompt(input, db);
  } catch (err) {
    return badRequest((err as Error).message);
  }

  let models: string[];
  try {
    const resolved = await resolveModelQueue(spec.id, requestedModel);
    if (resolved.error) return badRequest(resolved.error);
    models = resolved.models;
  } catch (err) {
    return badRequest((err as Error).message, 500);
  }

  const reasoningPref: ReasoningPreference = {
    ...(spec.defaultReasoning ?? AUTO_REASONING),
    ...(reasoning ?? {}),
  };

  const client = getOpenRouterClient();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(frame(event, data));
        } catch {
          closed = true;
        }
      };

      // Keep intermediate proxies from closing an idle connection while the
      // model thinks (some providers emit nothing for 20–40s at high effort).
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          closed = true;
        }
      }, 15000);

      const onAbort = () => {
        closed = true;
      };
      request.signal.addEventListener("abort", onAbort);

      let doneSent = false;
      const finish = (data?: unknown) => {
        if (doneSent) return;
        doneSent = true;
        send("done", data ?? {});
      };

      try {
        send("start", {
          requestId,
          task: spec.id,
          queue: models,
          reasoning: reasoningPref,
        });

        const result = await client.chatCompletionStream(
          [{ role: "user", content: prompt }],
          {
            models,
            temperature: spec.temperature,
            stop: spec.stop,
            reasoning: reasoningPref,
            signal: request.signal,
          },
          {
            onModelStart: (model, info) => send("model", { model, ...info }),
            onReasoningDelta: (delta, full) =>
              send("reasoning", { delta, length: full.length }),
            onContentDelta: (delta, full) =>
              send("content", { delta, length: full.length }),
            onUsage: (usage, model) => send("usage", { usage, model }),
          },
        );

        if (!result.success) {
          if (!result.error?.includes("aborted")) {
            console.error(
              `[API:generate:stream] ${requestId} - ${result.error}`,
            );
            send("error", { message: result.error });
          }
          finish();
          return;
        }

        send("status", { phase: "finalizing" });

        let data: unknown;
        try {
          data = spec.postProcess(result.data ?? "", input);
        } catch (err) {
          send("error", { message: (err as Error).message });
          finish();
          return;
        }

        if (result.modelUsed) {
          await storeUsage(db, spec.id, result.modelUsed, result);
        }

        send("result", {
          data,
          meta: {
            model: result.modelUsed,
            usage: result.usage,
            reasoningTokens: result.reasoningTokens,
            visibleTokens: result.visibleTokens,
            finishReason: result.finishReason,
            truncated: result.truncated,
            generationId: result.generationId,
          },
        });
        finish({ model: result.modelUsed });
      } catch (err) {
        console.error(`[API:generate:stream] ${requestId} -`, err);
        send("error", { message: (err as Error).message || "Stream failed" });
        finish();
      } finally {
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", onAbort);
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
