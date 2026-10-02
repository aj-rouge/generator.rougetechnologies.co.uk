// app/components/ThinkingIndicator.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { AIStreamStatus } from "../utils/useAIStream";

export type ThinkingTask = "title" | "sku" | "paragraphs" | "features" | "note";

const TASK_LABEL: Record<ThinkingTask, string> = {
  title: "title",
  sku: "SKU",
  paragraphs: "description",
  features: "features",
  note: "note",
};

const CONNECT_MESSAGES: Record<ThinkingTask, string[]> = {
  title: ["Reading the original title…", "Loading the title prompt…"],
  sku: ["Reading product details…", "Pulling recent SKUs…"],
  paragraphs: [
    "Reading specifications…",
    "Loading the description prompt…",
    "Finding key selling points…",
  ],
  features: ["Reading specifications…", "Loading the features prompt…"],
  note: ["Reading the description…", "Loading the note prompt…"],
};

const WRITE_MESSAGES: Record<ThinkingTask, string[]> = {
  title: ["Polishing the title…", "Trimming for length…"],
  sku: ["Finalising the SKU…", "Checking the format…"],
  paragraphs: ["Drafting paragraphs…", "Refining wording…", "Almost there…"],
  features: ["Writing feature descriptions…", "Almost there…"],
  note: ["Extracting the note…"],
};

const THINK_MESSAGES = [
  "Thinking it through…",
  "Weighing the options…",
  "Working out the details…",
  "Planning the answer…",
];

interface ThinkingIndicatorProps {
  task: ThinkingTask;
  /** Preferred: the state machine from useAIStream. */
  status?: AIStreamStatus;
  /** Legacy: plain boolean. Treated as `connecting`. */
  active?: boolean;
  /** Live chain-of-thought text (native reasoning or  thinking blocks). */
  reasoning?: string;
  /** Live answer text, shown as a preview while it streams in. */
  content?: string;
  model?: string | null;
  elapsedMs?: number;
  className?: string;
}

export function ThinkingIndicator({
  task,
  status,
  active,
  reasoning = "",
  content = "",
  model,
  elapsedMs = 0,
  className = "",
}: ThinkingIndicatorProps) {
  const resolved: AIStreamStatus = status ?? (active ? "connecting" : "idle");
  const isActive =
    resolved !== "idle" && resolved !== "done" && resolved !== "error";

  const [msgIndex, setMsgIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const preRef = useRef<HTMLPreElement | null>(null);

  const messages = useMemo(() => {
    if (resolved === "thinking") return THINK_MESSAGES;
    if (resolved === "writing") return WRITE_MESSAGES[task];
    if (resolved === "finalizing") return ["Checking the output…"];
    return CONNECT_MESSAGES[task];
  }, [resolved, task]);

  useEffect(() => {
    if (!isActive) {
      setMsgIndex(0);
      return;
    }
    setMsgIndex(0);
    const id = setInterval(
      () => setMsgIndex((i) => Math.min(i + 1, messages.length - 1)),
      1800,
    );
    return () => clearInterval(id);
  }, [isActive, resolved, messages.length]);

  // Follow the thinking text as it grows — unless the user scrolled up.
  useEffect(() => {
    if (!open || !autoScroll) return;
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [reasoning, open, autoScroll]);

  const reasoningChars = reasoning.length;
  const approxTokens = reasoningChars > 0 ? Math.round(reasoningChars / 4) : 0;

  // --- Pre-first-token progress: asymptotic curve so the bar moves. ---
  const [curve, setCurve] = useState(0);
  useEffect(() => {
    if (!isActive || resolved !== "connecting") return;
    setCurve(0);
    const start = Date.now();
    const id = setInterval(() => {
      const ratio = (Date.now() - start) / 6000;
      setCurve(Math.min(90, 88 * (1 - Math.exp(-1.4 * ratio))));
    }, 320);
    return () => clearInterval(id);
  }, [isActive, resolved]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`mt-3 flex flex-col gap-2 ${className}`}
        >
          {/* Status row */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple-500"
                  animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.1,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <div className="relative h-5 overflow-hidden flex-1">
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${resolved}-${msgIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 text-sm text-purple-700 dark:text-purple-300 font-medium truncate"
                >
                  {messages[msgIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {model && (
                <span className="hidden sm:inline-flex max-w-[180px] truncate px-2 py-0.5 rounded-full text-[11px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {model}
                </span>
              )}
              <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Progress: deterministic-ish before the first token, indeterminate after */}
          <div className="h-1 w-full rounded-full bg-purple-100 dark:bg-purple-950/40 overflow-hidden">
            {resolved === "connecting" ? (
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                animate={{ width: `${curve}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            ) : (
              <motion.div
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                animate={{ x: ["-120%", "320%"] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
              />
            )}
          </div>

          {/* Live chain of thought */}
          <AnimatePresence>
            {reasoningChars > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-purple-200/70 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                >
                  {open ? (
                    <ChevronDown className="w-3.5 h-3.5 text-purple-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-purple-500" />
                  )}
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-[11px] font-medium text-purple-800 dark:text-purple-300">
                    {resolved === "thinking" ? "Thinking" : "Thought process"}
                  </span>
                  <span className="text-[11px] text-purple-500/80 tabular-nums">
                    {reasoningChars.toLocaleString()} chars
                    {approxTokens > 0 && ` ≈ ${approxTokens} tok`}
                  </span>
                  <span className="flex-1" />
                  <span className="text-[10px] uppercase tracking-wide text-purple-400">
                    {resolved}
                  </span>
                </button>

                {open && (
                  <>
                    <div className="h-px bg-purple-200/60 dark:bg-purple-900/40" />
                    <pre
                      ref={preRef}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const atBottom =
                          el.scrollHeight - el.scrollTop - el.clientHeight < 24;
                        setAutoScroll(atBottom);
                      }}
                      className="max-h-40 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono text-purple-900/90 dark:text-purple-200/90 [mask-image:linear-gradient(to_bottom,transparent,black_16px)]"
                    >
                      {reasoning}
                      <motion.span
                        className="inline-block w-1.5 h-3 translate-y-0.5 bg-purple-500"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    </pre>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streaming answer preview */}
          {content && resolved === "writing" && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              <span className="font-medium">Writing: </span>
              {content.slice(-160)}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
