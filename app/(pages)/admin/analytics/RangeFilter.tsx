"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
} from "lucide-react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
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
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - ((day + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatShort(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

type Preset = { label: string; from: string; to: string };

export default function RangeFilter({
  from,
  to,
  view,
  sort,
}: {
  from?: string;
  to?: string;
  view?: string;
  sort?: string;
}) {
  const todayISO = toISO(new Date());

  const presets: Preset[] = useMemo(() => {
    const now = new Date();
    const today = toISO(now);
    const yesterday = toISO(addDays(now, -1));
    const last7 = toISO(addDays(now, -7));
    const last14 = toISO(addDays(now, -14));
    const last30 = toISO(addDays(now, -30));
    const last90 = toISO(addDays(now, -90));

    const weekStart = toISO(startOfWeek(now));
    const monthStart = toISO(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const lastMonthStart = toISO(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    const lastMonthEnd = toISO(new Date(now.getFullYear(), now.getMonth(), 0));
    const yearStart = toISO(new Date(now.getFullYear(), 0, 1));

    return [
      { label: "Today", from: today, to: today },
      { label: "Yesterday", from: yesterday, to: yesterday },
      { label: "Last 7 days", from: last7, to: today },
      { label: "Last 14 days", from: last14, to: today },
      { label: "Last 30 days", from: last30, to: today },
      { label: "Last 90 days", from: last90, to: today },
      { label: "This week", from: weekStart, to: today },
      { label: "This month", from: monthStart, to: monthEnd },
      { label: "Last month", from: lastMonthStart, to: lastMonthEnd },
      { label: "This year", from: yearStart, to: today },
    ];
  }, []);

  // Server default when the URL has no from/to is "this calendar month".
  const defaultPreset = presets.find((p) => p.label === "This month")!;
  const activeFrom = from ?? defaultPreset.from;
  const activeTo = to ?? defaultPreset.to;

  const activePreset = presets.find(
    (p) => p.from === activeFrom && p.to === activeTo,
  );

  // --- Trigger label: split into key (string) + content (JSX) ---
  const labelKey = activePreset
    ? activePreset.label
    : `${formatShort(activeFrom)}-${formatShort(activeTo)}`;

  const labelContent = activePreset ? (
    activePreset.label
  ) : (
    <span className="inline-flex items-center gap-1">
      {formatShort(activeFrom)}
      <ArrowRight className="h-3 w-3 shrink-0" />
      {formatShort(activeTo)}
    </span>
  );

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string | undefined>(undefined);
  const [end, setEnd] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Date>(() =>
    startOfMonth(fromISO(activeFrom)),
  );
  const [dir, setDir] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Outside click / Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function navigate(f: string, t: string) {
    const params = new URLSearchParams({ from: f, to: t });
    if (view === "edits") params.set("view", "edits");
    if (sort === "asc") params.set("sort", "asc");
    window.location.href = `/admin/analytics?${params.toString()}`;
  }

  function openPanel() {
    setStart(undefined);
    setEnd(undefined);
    setHover(null);
    setCursor(startOfMonth(fromISO(activeFrom)));
    setDir(1);
    setOpen(true);
  }

  function pickDay(iso: string) {
    // Begin a new selection.
    if (!start || (start && end)) {
      setStart(iso);
      setEnd(undefined);
      setHover(null);
      return;
    }
    // Complete the selection — auto-apply, swapping if needed.
    if (iso < start) navigate(iso, start);
    else navigate(start, iso);
  }

  function stepMonth(n: number) {
    setDir(n);
    setCursor((c) => addMonths(c, n));
  }

  // Calendar grid (Monday-first).
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  // Range used for highlighting (falls back to hover preview mid-selection).
  const previewEnd = start && !end && hover && hover >= start ? hover : end;
  const rangeLo =
    start && previewEnd ? (start <= previewEnd ? start : previewEnd) : start;
  const rangeHi =
    start && previewEnd
      ? start <= previewEnd
        ? previewEnd
        : start
      : previewEnd;

  // --- Pick hint: split into key (string) + content (JSX) ---
  const pickHintKey = start
    ? end
      ? `${formatShort(start)}-${formatShort(end)}`
      : `start-${formatShort(start)}`
    : "pick";

  const pickHintContent = start ? (
    end ? (
      <span className="inline-flex items-center gap-1">
        {formatShort(start)}
        <ArrowRight className="h-3 w-3 shrink-0" />
        {formatShort(end)}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1">
        <span>Start: {formatShort(start)}</span>
        <Minus className="h-3 w-3 shrink-0 text-gray-400" />
        <span className="text-gray-400">pick end date</span>
      </span>
    )
  ) : (
    "Pick start date"
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <motion.button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
      >
        <span className="text-gray-500">Range:</span>
        <span className="relative inline-block h-4 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={labelKey}
              className="inline-flex items-center font-medium"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {labelContent}
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.span
          className="inline-flex text-gray-400"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 z-20 mt-2 flex rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden"
          >
            {/* ---- Preset list ---- */}
            <div className="w-40 border-r border-gray-200 dark:border-gray-800 p-1.5 text-xs">
              <div className="px-2.5 pt-1 pb-2 text-[10px] uppercase tracking-wide text-gray-400">
                Quick ranges
              </div>
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: { staggerChildren: 0.018, delayChildren: 0.03 },
                  },
                }}
              >
                {presets.map((p) => {
                  const active = p.from === activeFrom && p.to === activeTo;
                  return (
                    <motion.button
                      key={p.label}
                      type="button"
                      onClick={() => navigate(p.from, p.to)}
                      variants={{
                        hidden: { opacity: 0, x: -6 },
                        show: { opacity: 1, x: 0 },
                      }}
                      whileTap={{ scale: 0.97 }}
                      className={
                        active
                          ? "relative w-full text-left px-2.5 py-1.5 rounded-md"
                          : "relative w-full text-left px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      }
                    >
                      {active && (
                        <motion.span
                          layoutId="preset-active"
                          className="absolute inset-0 rounded-md bg-gray-900 dark:bg-white"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 32,
                          }}
                        />
                      )}
                      <span
                        className={`relative z-10 ${
                          active ? "text-white dark:text-gray-900" : ""
                        }`}
                      >
                        {p.label}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            {/* ---- Custom range calendar ---- */}
            <div className="p-3 w-[290px]">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
                Custom range
              </div>
              <div className="relative text-xs text-gray-600 dark:text-gray-400 mb-2 h-4 truncate">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={pickHintKey}
                    className="absolute inset-0 inline-flex items-center"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  >
                    {pickHintContent}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mb-2">
                <motion.button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </motion.button>

                <div className="relative h-5 min-w-[110px] text-center overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${y}-${m}`}
                      className="absolute inset-0 text-sm font-medium"
                      initial={{ opacity: 0, x: dir * 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: dir * -8 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      {MONTH_NAMES[m]} {y}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <motion.button
                  type="button"
                  onClick={() => stepMonth(1)}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-[10px] text-gray-500 uppercase mb-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${y}-${m}`}
                    className="grid grid-cols-7 gap-0.5"
                    initial={{ opacity: 0, x: dir * 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -14 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {cells.map((d, i) => {
                      if (!d) return <div key={i} />;
                      const iso = toISO(d);
                      const isFuture = iso > todayISO;
                      const isToday = iso === todayISO;
                      const isStart = iso === start;
                      const isEnd = iso === end;
                      const inRange =
                        rangeLo && rangeHi && iso >= rangeLo && iso <= rangeHi;
                      const isEdge = isStart || isEnd;

                      const cls = [
                        "relative text-xs h-7 w-7 rounded-md text-center",
                        isFuture
                          ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800",
                        inRange && !isEdge
                          ? "bg-gray-100 dark:bg-gray-800"
                          : "",
                        isToday && !isEdge
                          ? "ring-1 ring-gray-400 dark:ring-gray-600"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <motion.button
                          key={i}
                          type="button"
                          disabled={isFuture}
                          onClick={() => pickDay(iso)}
                          onMouseEnter={() => setHover(iso)}
                          onMouseLeave={() => setHover(null)}
                          whileTap={isFuture ? undefined : { scale: 0.88 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                          className={cls}
                        >
                          {isEdge && (
                            <motion.span
                              layoutId="day-edge"
                              className="absolute inset-0 rounded-md bg-gray-900 dark:bg-white"
                              transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 32,
                              }}
                            />
                          )}
                          <span
                            className={`relative z-10 ${
                              isEdge ? "text-white dark:text-gray-900" : ""
                            }`}
                          >
                            {d.getDate()}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
