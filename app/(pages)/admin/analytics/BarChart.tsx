"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DailyRow = {
  day: string;
  user_id: string;
  user_name: string;
  action: string;
  actions: number;
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const ACTION_ORDER = [
  "create",
  "import",
  "publish",
  "ai_generate",
  "update",
  "restore",
  "delete",
  "login",
];

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  restore: "Restored",
  import: "Imported",
  publish: "Published",
  ai_generate: "AI generated",
  login: "Logged in",
};

const ACTION_TINT: Record<string, number> = {
  create: 1.0,
  import: 0.85,
  publish: 0.75,
  ai_generate: 0.6,
  update: 0.5,
  restore: 0.7,
  delete: 0.92,
  login: 0.35,
};

const DESKTOP_H = 180;
const MOBILE_H = 130;
const TOOLTIP_W = 260;

type Segment = {
  userId: string;
  userName: string;
  color: string;
  total: number;
  breakdown: { action: string; count: number }[];
};

type DayValue = {
  key: string;
  label: string;
  full: string;
  segments: Segment[];
  total: number;
};

// ----------------------------------------------------------------
// Small responsive hook — safe under SSR (defaults to false)
// ----------------------------------------------------------------
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

// ----------------------------------------------------------------
// Reusable tooltip body — rendered floating on desktop,
// inline below the chart on mobile.
// ----------------------------------------------------------------
function TooltipBody({ day }: { day: DayValue }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 w-full sm:w-[260px]">
      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
        {day.full}
      </div>
      <div className="text-[11px] text-gray-500 mt-0.5">
        {day.total} {day.total === 1 ? "action" : "actions"}
      </div>

      {day.segments.length === 0 ? (
        <div className="text-[11px] text-gray-400 italic mt-2">No activity</div>
      ) : (
        <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
          {day.segments.map((seg) => (
            <div key={seg.userId}>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700 dark:text-gray-200">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.userName}</span>
                <span className="ml-auto tabular-nums text-gray-500">
                  {seg.total}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 ml-3.5">
                {seg.breakdown.map((b) => (
                  <span
                    key={b.action}
                    className="text-[10px] text-gray-500 whitespace-nowrap"
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                      style={{
                        backgroundColor: seg.color,
                        opacity: ACTION_TINT[b.action] ?? 0.6,
                      }}
                    />
                    {ACTION_LABELS[b.action] ?? b.action}
                    <span className="ml-1 tabular-nums text-gray-700 dark:text-gray-300">
                      {b.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------
export default function BarChart({
  data,
  range,
  keys,
}: {
  data: DailyRow[];
  range: { from: number; to: number };
  keys: { id: string; label: string }[];
}) {
  const isMobile = useIsMobile();
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { values, max } = useMemo(() => {
    const colorOf = new Map<string, string>();
    keys.forEach((k, i) => colorOf.set(k.id, COLORS[i % COLORS.length]));

    const start = new Date(range.from);
    const end = new Date(range.to - 1);
    const days: { key: string; label: string; full: string }[] = [];
    const cursor = new Date(start);
    while (cursor <= end && days.length < 400) {
      const iso = cursor.toISOString().slice(0, 10);
      days.push({
        key: iso,
        label: cursor.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        full: cursor.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // day -> user -> action -> count
    const byDay = new Map<string, Map<string, Map<string, number>>>();
    for (const row of data) {
      let byUser = byDay.get(row.day);
      if (!byUser) {
        byUser = new Map();
        byDay.set(row.day, byUser);
      }
      let byAction = byUser.get(row.user_id);
      if (!byAction) {
        byAction = new Map();
        byUser.set(row.user_id, byAction);
      }
      byAction.set(row.action, (byAction.get(row.action) ?? 0) + row.actions);
    }

    const orderIdx = (a: string) => {
      const i = ACTION_ORDER.indexOf(a);
      return i === -1 ? 999 : i;
    };

    const values: DayValue[] = days.map((d) => {
      const byUser = byDay.get(d.key);
      const segments: Segment[] = [];
      let total = 0;
      if (byUser) {
        for (const k of keys) {
          const byAction = byUser.get(k.id);
          if (!byAction) continue;
          let userTotal = 0;
          const breakdown = Array.from(byAction.entries())
            .map(([action, count]) => {
              userTotal += count;
              return { action, count };
            })
            .sort((a, b) => orderIdx(a.action) - orderIdx(b.action));
          if (userTotal === 0) continue;
          segments.push({
            userId: k.id,
            userName: k.label,
            color: colorOf.get(k.id)!,
            total: userTotal,
            breakdown,
          });
          total += userTotal;
        }
      }
      return { ...d, segments, total };
    });

    const max = Math.max(1, ...values.map((v) => v.total));
    return { values, max };
  }, [data, range, keys]);

  const active = activeDay
    ? (values.find((v) => v.key === activeDay) ?? null)
    : null;

  // Close mobile tooltip on tap outside the chart card
  useEffect(() => {
    if (!isMobile || !activeDay) return;
    const onDown = (e: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setActiveDay(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isMobile, activeDay]);

  // Reset transient state when crossing the breakpoint
  useEffect(() => {
    setHover(null);
    setActiveDay(null);
  }, [isMobile]);

  const chartHeight = isMobile ? MOBILE_H : DESKTOP_H;
  // Keep bars tappable even on the densest ranges — container scrolls when needed
  const minBarWidth = isMobile ? 8 : 6;

  return (
    <div ref={wrapperRef} className="relative">
      {/* ---------- Scrollable chart area ---------- */}
      <div className="overflow-x-auto pb-1">
        <div
          className="flex items-end gap-px sm:gap-0.5"
          style={{
            height: chartHeight,
            minWidth: values.length * minBarWidth,
          }}
        >
          {values.map((v) => {
            const h =
              v.total === 0 ? 2 : Math.max(3, (v.total / max) * chartHeight);
            const isActive = activeDay === v.key;
            return (
              <button
                key={v.key}
                type="button"
                aria-label={`${v.full}: ${v.total} actions`}
                aria-pressed={isActive}
                className="relative flex-1 min-w-[6px] flex flex-col justify-end outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm"
                style={{ height: chartHeight }}
                onPointerEnter={(e) => {
                  if (isMobile) return;
                  setActiveDay(v.key);
                  setHover({ x: e.clientX, y: e.clientY });
                }}
                onPointerMove={(e) => {
                  if (isMobile) return;
                  if (activeDay === v.key)
                    setHover({ x: e.clientX, y: e.clientY });
                }}
                onPointerLeave={() => {
                  if (isMobile) return;
                  setActiveDay(null);
                  setHover(null);
                }}
                onPointerDown={(e) => {
                  // Touch: toggle inline panel. Mouse: handled by hover.
                  if (isMobile) {
                    e.preventDefault();
                    setActiveDay(activeDay === v.key ? null : v.key);
                  }
                }}
                onFocus={() => setActiveDay(v.key)}
                onBlur={() => {
                  if (!isMobile) {
                    setActiveDay(null);
                    setHover(null);
                  }
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -inset-x-1 rounded bg-gray-900/[0.05] dark:bg-white/[0.08]"
                  />
                )}
                <span
                  className="relative w-full rounded-[3px] flex flex-col-reverse overflow-hidden"
                  style={{
                    height: h,
                    backgroundColor:
                      v.total === 0 ? "rgba(127,127,127,0.15)" : "transparent",
                  }}
                >
                  {v.segments.map((seg) => (
                    <span
                      key={seg.userId}
                      className="w-full flex flex-col-reverse"
                    >
                      {seg.breakdown.map((b) => (
                        <span
                          key={b.action}
                          style={{
                            height: (b.count / max) * chartHeight,
                            backgroundColor: seg.color,
                            opacity: ACTION_TINT[b.action] ?? 0.6,
                          }}
                        />
                      ))}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- X axis (middle label hidden on phones) ---------- */}
      {values.length > 1 && (
        <div className="flex justify-between mt-2 text-[10px] text-gray-400 tabular-nums">
          <span>{values[0].label}</span>
          <span className="hidden sm:inline">
            {values[Math.floor(values.length / 2)].label}
          </span>
          <span>{values[values.length - 1].label}</span>
        </div>
      )}

      {/* ---------- Mobile: inline detail panel ---------- */}
      {isMobile && active && (
        <div className="mt-3">
          <TooltipBody day={active} />
        </div>
      )}

      {/* ---------- User legend (horizontal scroll on small screens) ---------- */}
      <div className="mt-4 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs min-w-max sm:min-w-0">
          {keys.map((k, i) => (
            <div key={k.id} className="flex items-center gap-1.5 shrink-0">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {k.label}
              </span>
            </div>
          ))}
          {keys.length === 0 && (
            <span className="text-gray-400">No users with activity</span>
          )}
        </div>
      </div>

      {/* ---------- Desktop: floating tooltip ---------- */}
      {!isMobile && hover && active && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: Math.min(hover.x + 14, window.innerWidth - TOOLTIP_W - 12),
            top: Math.min(hover.y + 14, window.innerHeight - 220),
          }}
        >
          <TooltipBody day={active} />
        </div>
      )}
    </div>
  );
}
