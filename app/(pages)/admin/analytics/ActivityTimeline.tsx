"use client";

import { useEffect, useState } from "react";

type RecentEvent = {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  summary: string | null;
  changes: string | null;
  metadata: string | null;
  created_at: number;
};

const ACTION_STYLES: Record<
  string,
  { label: string; chip: string; dot: string }
> = {
  create: {
    label: "created",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  update: {
    label: "updated",
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  delete: {
    label: "deleted",
    chip: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
  restore: {
    label: "restored",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  import: {
    label: "imported",
    chip: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  publish: {
    label: "published",
    chip: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
    dot: "bg-teal-500",
  },
  ai_generate: {
    label: "AI",
    chip: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
    dot: "bg-pink-500",
  },
  login: {
    label: "signed in",
    chip: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
    dot: "bg-gray-400",
  },
};

const FALLBACK_STYLE = {
  label: "acted",
  chip: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  dot: "bg-gray-400",
};

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

/** 1 Oct 2026 14:23:45 — matches ProductsTable */
function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm}:${ss}`;
}

/**
 * Richer relative formatter. Returns an "after …" phrase describing how
 * much time has passed since the event, e.g.:
 *   "just now", "after 1 minute", "after 5 minutes",
 *   "after 2 hours", "after 3 days", "after 2 weeks",
 *   "after 4 months", "after 1 year", "after 2 years".
 */
function relAfter(ts: number, now: number): string {
  const ms = Math.max(0, now - ts);
  const s = Math.round(ms / 1000);

  if (s < 45) return "just now";

  const plural = (n: number, unit: string) =>
    `after ${n} ${unit}${n === 1 ? "" : "s"}`;

  if (s < 90) return plural(1, "minute");

  const m = Math.round(s / 60);
  if (m < 60) return plural(m, "minute");

  const h = Math.round(m / 60);
  if (h < 24) return plural(h, "hour");

  const d = Math.round(h / 24);
  if (d < 7) return plural(d, "day");

  // weeks up to ~4
  const w = Math.round(d / 7);
  if (w < 5) return plural(w, "week");

  // months — rough; 30 days
  const mo = Math.round(d / 30);
  if (mo < 12) return plural(mo, "month");

  const y = Math.round(d / 365);
  return plural(Math.max(1, y), "year");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function hueFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export default function ActivityTimeline({
  events,
}: {
  events: RecentEvent[];
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (events.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        No recent activity in this range.
      </div>
    );
  }

  return (
    <ol className="relative max-h-[440px] overflow-y-auto pr-1">
      <span
        aria-hidden
        className="absolute left-[13px] top-3 bottom-3 w-px bg-gray-200 dark:bg-gray-800"
      />
      {events.map((e) => {
        const st = ACTION_STYLES[e.action] ?? FALLBACK_STYLE;
        const userHue = hueFor(e.user_id ?? e.user_name);
        const target = e.entity_label || e.entity_id;
        const exact = formatDateTime(e.created_at);
        const relative = relAfter(e.created_at, now);
        return (
          <li key={e.id} className="relative pl-9 py-2">
            <span
              className={`absolute left-[8px] top-3.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${st.dot}`}
            />
            <div className="flex items-start gap-2 flex-wrap">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-semibold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: `hsl(${userHue} 60% 45%)` }}
                title={e.user_name}
              >
                {initials(e.user_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {e.user_name}
                  </span>
                  <span
                    className={`px-1.5 py-px rounded text-[10px] font-medium ${st.chip}`}
                  >
                    {st.label}
                  </span>
                  <span className="text-gray-500">{e.entity_type}</span>
                  {target && (
                    <span
                      className="text-gray-900 dark:text-gray-100 truncate max-w-[240px]"
                      title={target}
                    >
                      {target}
                    </span>
                  )}
                </div>
                {e.summary && (
                  <div
                    className="text-[11px] text-gray-500 mt-0.5 truncate"
                    title={e.summary}
                  >
                    {e.summary}
                  </div>
                )}
              </div>
              <time
                className="text-xs text-gray-400 tabular-nums shrink-0 mt-0.5 whitespace-nowrap"
                dateTime={new Date(e.created_at).toISOString()}
                title={`${relative} · ${exact}`}
              >
                {exact}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
