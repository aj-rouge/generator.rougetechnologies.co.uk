"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReasoningPreference } from "../utils/openrouter/reasoning";

export type AIStreamStatus =
  | "idle"
  | "connecting"
  | "thinking"
  | "writing"
  | "finalizing"
  | "done"
  | "error";

export interface AIStreamUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}

export interface AIStreamState<T> {
  status: AIStreamStatus;
  reasoning: string;
  content: string;
  result: T | null;
  error: string | null;
  model: string | null;
  queue: string[];
  modelIndex: number;
  usage: AIStreamUsage | null;
  reasoningTokens: number;
  elapsedMs: number;
}

const EMPTY = {
  status: "idle" as AIStreamStatus,
  reasoning: "",
  content: "",
  result: null,
  error: null,
  model: null,
  queue: [] as string[],
  modelIndex: 0,
  usage: null,
  reasoningTokens: 0,
  elapsedMs: 0,
};

export interface RunArgs {
  task: string;
  model?: string;
  reasoning?: ReasoningPreference;
  [key: string]: unknown;
}

/** Minimal SSE frame reader for `text/event-stream` responses. */
async function readSSE(
  body: ReadableStream<Uint8Array>,
  onFrame: (event: string, data: any) => void,
  signal?: AbortSignal,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "message";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, "");
        buffer = buffer.slice(idx + 1);

        if (line === "") {
          eventName = "message";
          continue;
        }
        if (line.startsWith(":")) continue; // keepalive comment
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          const payload = line.slice(5).trim();
          try {
            onFrame(eventName, JSON.parse(payload));
          } catch {
            onFrame(eventName, payload);
          }
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
    void signal;
  }
}

export function useAIStream<T = any>(options?: {
  onDone?: (result: T) => void;
  onError?: (message: string) => void;
}) {
  const [state, setState] = useState<AIStreamState<T>>({ ...EMPTY });
  const runIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(
    () => () => {
      stopTimer();
      abortRef.current?.abort();
    },
    [],
  );

  const reset = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();
    setState({ ...EMPTY });
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();
    setState((s) => ({ ...s, status: "idle", error: null }));
  }, []);

  const run = useCallback(
    async (args: RunArgs): Promise<T | null> => {
      const runId = ++runIdRef.current;
      const alive = () => runIdRef.current === runId;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startedAtRef.current = Date.now();
      setState({ ...EMPTY, status: "connecting" });
      stopTimer();
      timerRef.current = setInterval(() => {
        if (!alive() || startedAtRef.current === null) return;
        setState((s) => ({
          ...s,
          elapsedMs: Date.now() - (startedAtRef.current as number),
        }));
      }, 100);

      let finalResult: T | null = null;
      let finalError: string | null = null;

      const handleFrame = (event: string, data: any) => {
        if (!alive()) return;
        switch (event) {
          case "start":
            setState((s) => ({
              ...s,
              queue: data?.queue ?? [],
              modelIndex: 0,
            }));
            break;
          case "model":
            setState((s) => ({
              ...s,
              model: data?.model ?? s.model,
              modelIndex: data?.index ?? s.modelIndex,
              content: "",
              reasoning: "",
              status: "thinking",
            }));
            break;
          case "reasoning":
            setState((s) => ({
              ...s,
              status: "thinking",
              reasoning: s.reasoning + (data?.delta ?? ""),
            }));
            break;
          case "content":
            setState((s) => ({
              ...s,
              status: "writing",
              content: s.content + (data?.delta ?? ""),
            }));
            break;
          case "status":
            if (data?.phase === "finalizing") {
              setState((s) => ({ ...s, status: "finalizing" }));
            }
            break;
          case "usage":
            setState((s) => ({
              ...s,
              usage: data?.usage ?? null,
              reasoningTokens:
                data?.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
            }));
            break;
          case "result":
            finalResult = (data?.data ?? null) as T;
            setState((s) => ({ ...s, result: finalResult, status: "done" }));
            break;
          case "error":
            finalError = data?.message ?? "Generation failed";
            break;
          default:
            break;
        }
      };

      try {
        const res = await fetch("/api/generate/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
          signal: controller.signal,
        });

        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          try {
            const json = (await res.json()) as { error?: string };
            message = json?.error || message;
          } catch {
            /* ignore */
          }
          throw new Error(message);
        }
        if (!res.body) throw new Error("Response body is not readable");

        await readSSE(res.body, handleFrame, controller.signal);

        if (finalError) throw new Error(finalError);
        if (!alive()) return null;
        if (finalResult !== null) {
          setState((s) => ({ ...s, status: "done" }));
          options?.onDone?.(finalResult as T);
          return finalResult;
        }
        throw new Error("Stream ended without a result");
      } catch (err: any) {
        const message =
          err?.name === "AbortError" ? "Cancelled" : (err?.message ?? "Failed");
        if (alive() && message !== "Cancelled") {
          setState((s) => ({ ...s, status: "error", error: message }));
          options?.onError?.(message);
        }
        return null;
      } finally {
        if (alive()) stopTimer();
      }
    },
    [options],
  );

  const isActive =
    state.status !== "idle" &&
    state.status !== "done" &&
    state.status !== "error";

  return { ...state, run, cancel, reset, isActive };
}
