"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ChevronRight, User as UserIcon } from "lucide-react";
import type { RecentEvent } from "../../../utils/d1/analytics";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** 4 Oct 2026 17:35:22 */
function fmtAbsolute(ms: number): string {
  const d = new Date(ms);
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm}:${ss}`;
}

/** 4 days ago / just now / 3 months ago */
function fmtRelative(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  if (diffDay < 30) {
    const w = Math.floor(diffDay / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  if (diffDay < 365) {
    const mo = Math.floor(diffDay / 30);
    return `${mo} month${mo === 1 ? "" : "s"} ago`;
  }
  const y = Math.floor(diffDay / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const ACTION_BADGE: Record<string, string> = {
  create:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900",
  update:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900",
  delete:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
  restore:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900",
  import:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  publish:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
  ai_generate:
    "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900",
};
function badgeClass(action: string): string {
  return (
    ACTION_BADGE[action] ??
    "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
  );
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

const ACTION_DOT: Record<string, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  restore: "bg-purple-500",
  import: "bg-amber-500",
  publish: "bg-emerald-500",
  ai_generate: "bg-pink-500",
};

// ----------------------------------------------------------------
// Animation variants
// ----------------------------------------------------------------
const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};

const diffContainerVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      opacity: { duration: 0.2, delay: 0.05 },
      staggerChildren: 0.035,
      delayChildren: 0.08,
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: [0.4, 0, 1, 1] },
      opacity: { duration: 0.12 },
    },
  },
};

const diffLineVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.18, ease: "easeOut" },
  },
};

const badgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.18, ease: "easeOut" },
  },
};

const STORAGE_KEY = "analytics:relativeTime";

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------
export default function ActivityFeed({ events }: { events: RecentEvent[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Timestamp format preference — defaults to absolute, persisted in localStorage.
  const [relativeTime, setRelativeTime] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setRelativeTime(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTimeFormat = () => {
    setRelativeTime((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fmtTime = (ms: number) =>
    relativeTime ? fmtRelative(ms) : fmtAbsolute(ms);

  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-center text-sm text-gray-500 py-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
      >
        No activity in this range
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {events.map((e) => {
        const changes = e.changes ? safeParse(e.changes) : [];
        const hasChanges = Array.isArray(changes) && changes.length > 0;
        const isExpanded = expanded.has(e.id);
        const isNoOp = e.action === "update" && !hasChanges;
        const expandable = hasChanges;

        return (
          <motion.div
            key={e.id}
            variants={itemVariants}
            whileHover={expandable ? { y: -1 } : undefined}
            transition={{ duration: 0.15 }}
            className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden transition-colors ${
              expandable
                ? "cursor-pointer hover:border-gray-300 dark:hover:border-gray-700"
                : ""
            }`}
            onClick={expandable ? () => toggle(e.id) : undefined}
            role={expandable ? "button" : undefined}
            tabIndex={expandable ? 0 : undefined}
            onKeyDown={
              expandable
                ? (ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      toggle(e.id);
                    }
                  }
                : undefined
            }
          >
            {/* ---------- Row header ---------- */}
            <div className="px-4 py-3 flex items-start gap-3">
              {expandable ? (
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-1.5 inline-flex text-gray-400 dark:text-gray-500 shrink-0"
                  aria-hidden
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.span>
              ) : (
                <span className="mt-1.5 w-4 shrink-0" aria-hidden />
              )}

              <motion.div
                whileHover={{ scale: 1.08, rotate: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0 ${avatarColor(
                  e.user_id ?? e.user_name,
                )}`}
                title={e.user_name}
              >
                {initials(e.user_name || "?")}
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {e.user_name}
                  </span>

                  <motion.span
                    variants={badgeVariants}
                    className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded border ${badgeClass(
                      e.action,
                    )}`}
                  >
                    {e.action}
                  </motion.span>

                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {e.summary ?? `${e.action} ${e.entity_type}`}
                  </span>

                  {/* Clickable timestamp — toggles format for the whole feed */}
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleTimeFormat();
                    }}
                    onKeyDown={(ev) => {
                      // Prevent the outer row's Enter/Space handler from
                      // also firing when the user tabs onto this button.
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.stopPropagation();
                      }
                    }}
                    title={
                      relativeTime
                        ? `Absolute: ${fmtAbsolute(e.created_at)}`
                        : `Relative: ${fmtRelative(e.created_at)}`
                    }
                    className="ml-auto text-xs text-gray-500 whitespace-nowrap tabular-nums hover:text-gray-900 dark:hover:text-white hover:underline decoration-dotted underline-offset-2"
                  >
                    {fmtTime(e.created_at)}
                  </button>
                </div>

                <div className="mt-0.5 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                  {e.entity_type && (
                    <span className="font-mono">{e.entity_type}</span>
                  )}
                  {e.entity_label && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-md">
                        {e.entity_label}
                      </span>
                    </>
                  )}
                  {hasChanges && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          {changes.length}
                        </span>
                        <span>
                          field{changes.length === 1 ? "" : "s"} changed
                        </span>
                      </span>
                    </>
                  )}
                  {isNoOp && (
                    <>
                      <span>·</span>
                      <span className="italic">no field changes</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ---------- Diff block ---------- */}
            <AnimatePresence initial={false}>
              {isExpanded && hasChanges && (
                <motion.div
                  key="diff"
                  variants={diffContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="border-t border-gray-200 dark:border-gray-800 overflow-hidden"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 text-xs">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 500,
                        damping: 22,
                      }}
                      className={`w-2 h-2 rounded-full ${ACTION_DOT[e.action] ?? "bg-gray-400"}`}
                    />
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      {e.entity_type}
                    </span>
                    {e.entity_label && (
                      <>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-500 truncate">
                          {e.entity_label}
                        </span>
                      </>
                    )}
                    <span className="ml-auto text-gray-500">
                      {changes.length} field{changes.length === 1 ? "" : "s"}{" "}
                      changed
                    </span>
                  </div>

                  <div className="text-xs font-mono">
                    {changes.map((c: any, i: number) => (
                      <DiffBlock key={i} change={c} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ----------------------------------------------------------------
// One field's diff — field name, then − and + lines
// ----------------------------------------------------------------
function DiffBlock({
  change,
}: {
  change: { field: string; old: unknown; new: unknown };
}) {
  const oldStr = fmtVal(change.old);
  const newStr = fmtVal(change.new);

  return (
    <motion.div
      variants={diffLineVariants}
      className="border-b border-gray-100 dark:border-gray-800/60 last:border-b-0"
    >
      <div className="px-4 py-1.5 bg-gray-50/50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 text-[11px] border-b border-gray-100 dark:border-gray-800/60">
        {change.field}
      </div>

      {change.old !== null && change.old !== undefined && (
        <motion.div
          variants={diffLineVariants}
          className="flex bg-red-50 dark:bg-red-950/30"
        >
          <span className="w-10 shrink-0 text-center select-none text-red-400 dark:text-red-500/70 border-r border-red-100 dark:border-red-900/40">
            −
          </span>
          <span className="px-3 py-1.5 text-red-800 dark:text-red-300 whitespace-pre-wrap break-all">
            {oldStr}
          </span>
        </motion.div>
      )}

      {change.new !== null && change.new !== undefined && (
        <motion.div
          variants={diffLineVariants}
          className="flex bg-green-50 dark:bg-green-950/30"
        >
          <span className="w-10 shrink-0 text-center select-none text-green-500 dark:text-green-400/70 border-r border-green-100 dark:border-green-900/40">
            +
          </span>
          <span className="px-3 py-1.5 text-green-800 dark:text-green-300 whitespace-pre-wrap break-all">
            {newStr}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ----------------------------------------------------------------
function safeParse(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
