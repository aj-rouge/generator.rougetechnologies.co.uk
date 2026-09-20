"use client";

import { useMemo } from "react";

type DailyRow = {
  day: string;
  user_id: string;
  user_name: string;
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

export default function BarChart({
  data,
  range,
  keys,
}: {
  data: DailyRow[];
  range: { from: number; to: number };
  keys: { id: string; label: string }[];
}) {
  const { days, values, max } = useMemo(() => {
    const colorOf = new Map<string, string>();
    keys.forEach((k, i) => colorOf.set(k.id, COLORS[i % COLORS.length]));

    // Build a date spine between from and to (inclusive)
    const start = new Date(range.from);
    const end = new Date(range.to - 1);
    const days: { key: string; label: string }[] = [];
    const cursor = new Date(start);
    while (cursor <= end && days.length < 400) {
      const iso = cursor.toISOString().slice(0, 10);
      days.push({
        key: iso,
        label: cursor.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Aggregate per day, split by user
    const byDay = new Map<string, Map<string, number>>();
    for (const row of data) {
      if (!byDay.has(row.day)) byDay.set(row.day, new Map());
      byDay.get(row.day)!.set(row.user_id, row.actions);
    }

    const values = days.map((d) => {
      const users = byDay.get(d.key) ?? new Map();
      return {
        day: d.key,
        label: d.label,
        segments: keys
          .map((k) => ({
            userId: k.id,
            userName: k.label,
            color: colorOf.get(k.id)!,
            value: users.get(k.id) ?? 0,
          }))
          .filter((s) => s.value > 0),
      };
    });

    const max = Math.max(
      1,
      ...values.map((v) => v.segments.reduce((sum, s) => sum + s.value, 0)),
    );

    return { days, values, max };
  }, [data, range, keys]);

  const chartHeight = 160;

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: chartHeight }}>
        {values.map((v) => {
          const total = v.segments.reduce((s, x) => s + x.value, 0);
          const heightPx = total === 0 ? 2 : (total / max) * chartHeight;
          return (
            <div
              key={v.day}
              className="flex-1 min-w-[6px] flex flex-col justify-end group relative"
              style={{ height: chartHeight }}
              title={`${v.label}: ${total} actions`}
            >
              <div
                className="w-full rounded-sm flex flex-col-reverse overflow-hidden transition-all"
                style={{
                  height: heightPx,
                  backgroundColor:
                    total === 0 ? "rgba(0,0,0,0.06)" : "transparent",
                }}
              >
                {v.segments.map((s) => {
                  const segPx = (s.value / max) * chartHeight;
                  return (
                    <div
                      key={s.userId}
                      style={{
                        height: segPx,
                        backgroundColor: s.color,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs">
        {keys.map((k, i) => (
          <div key={k.id} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-gray-600 dark:text-gray-400">{k.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
