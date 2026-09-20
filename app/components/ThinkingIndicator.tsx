// app/components/ThinkingIndicator.tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ThinkingTask = "title" | "sku" | "paragraphs" | "features" | "note";

// Estimated duration in ms per task — used as a hint for the progress curve
// and for pacing the rotating messages.
const TASK_DURATION: Record<ThinkingTask, number> = {
  title: 3000,
  sku: 3500,
  paragraphs: 25000,
  features: 20000,
  note: 3000,
};

const TASK_MESSAGES: Record<ThinkingTask, string[]> = {
  title: ["Reading title…", "Rewriting for SEO…", "Polishing…"],
  sku: [
    "Reading product details…",
    "Matching existing SKUs…",
    "Finalising SKU…",
  ],
  paragraphs: [
    "Reading specifications…",
    "Thinking about structure…",
    "Planning key selling points…",
    "Drafting paragraphs…",
    "Refining wording…",
    "Almost done…",
  ],
  features: [
    "Reading specifications…",
    "Thinking about what matters…",
    "Selecting key features…",
    "Writing descriptions…",
    "Almost done…",
  ],
  note: ["Reading description…", "Extracting note…"],
};

interface ThinkingIndicatorProps {
  task: ThinkingTask;
  active: boolean;
  className?: string;
}

export function ThinkingIndicator({
  task,
  active,
  className = "",
}: ThinkingIndicatorProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const messages = TASK_MESSAGES[task] || ["Working…"];
  const duration = TASK_DURATION[task] || 4000;

  // --- Rotating messages ---
  useEffect(() => {
    if (!active) {
      setMsgIndex(0);
      return;
    }
    const interval = duration / messages.length;
    const id = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, messages.length - 1));
    }, interval);
    return () => clearInterval(id);
  }, [active, task, duration, messages.length]);

  // --- Progress creep ---
  // Instead of a linear tween to 90%, we advance in small random steps
  // along an asymptotic curve that slows near the ceiling and never
  // reaches 100%. This reads as "thinking" rather than "downloading".
  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    setProgress(0);

    const start = Date.now();
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const ratio = elapsed / duration; // how far along we expect to be

      // Asymptotic target curve.
      //   ratio 0    →  0%
      //   ratio 0.25 → ~32%
      //   ratio 0.5  → ~53%
      //   ratio 1.0  → ~77%
      //   ratio 2.0  → ~92%
      //   ratio 3.0  → ~95% (capped)
      const curve = 96 * (1 - Math.exp(-1.6 * ratio));

      setProgress((prev) => {
        // Small random jitter so the bar never moves in a perfectly
        // smooth line — feels more like real uncertain progress.
        const jitter = (Math.random() - 0.5) * 1.4; // ±0.7%
        const target = Math.min(95, curve + jitter);
        // Monotonic: never go backwards, even if jitter would dip.
        return target > prev ? target : prev;
      });

      // Randomised interval so updates don't land on a metronome beat.
      timeoutId = setTimeout(tick, 380 + Math.random() * 320);
    };

    // First tick shortly after mount so 0% is visible for a beat.
    timeoutId = setTimeout(tick, 220 + Math.random() * 180);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [active, task, duration]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`mt-3 flex flex-col gap-2 ${className}`}
        >
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
                  key={msgIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 text-sm text-purple-700 dark:text-purple-300 font-medium"
                >
                  {messages[msgIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          <div className="h-1 w-full rounded-full bg-purple-100 dark:bg-purple-950/40 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
