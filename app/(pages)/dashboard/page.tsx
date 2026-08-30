// app/dashboard/page.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Zap,
  Clock,
  BarChart3,
  Layers,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Types ----------
interface UsageData {
  totals: {
    total_tokens: number;
    total_requests: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    current_rate_limit_remaining: number;
    current_rate_limit_reset: number;
  };
  daily: Array<{ day: string; tokens: number; requests: number }>;
  byTask: Array<{ task: string; tokens: number; requests: number }>;
}

interface LogEntry {
  id: number;
  task: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  request_timestamp: number;
  rate_limit_remaining: number;
  rate_limit_reset: number;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------- Helpers ----------
const formatDate = (ts: number) => {
  const d = new Date(ts);
  const day = d.getDate();
  const suffix = (n: number) => {
    if (n > 3 && n < 21) return "th";
    switch (n % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day}${suffix(day)} ${month} ${year} ${hours}:${minutes}`;
};

// ---------- Skeleton Component (static content preserved) ----------
function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-4">
      {/* Header – static title and icon */}
      <div className="w-full flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-8 h-8 text-purple-500" />
          AI Usage Dashboard
        </h1>
        <Link
          href="/"
          className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards – static labels, icons, pulsing values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-center gap-3 h-full">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Requests
            </div>
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-center gap-3 h-full">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Tokens
            </div>
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-center gap-3 h-full">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Remaining Requests
            </div>
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-center gap-3 h-full">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Layers className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Prompt / Completion
            </div>
            <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
      {/* Daily Chart – static heading, pulsing chart area */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">
          Daily Tokens (Last 7 Days)
        </h2>
        <div className="w-full h-[300px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      {/* Usage by Task – static heading, pulsing items */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Usage by Task</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex justify-between p-2 border-b border-gray-200 dark:border-gray-700"
            >
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* Logs Table – static headers, pulsing rows and pagination info */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Logs</h2>
        <div className="overflow-x-auto min-h-[800px]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Task</th>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-right">Prompt</th>
                <th className="px-3 py-2 text-right">Completion</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Timestamp</th>
                <th className="px-3 py-2 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-3 py-2">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Placeholder – static "Page" and "of", pulsing numbers */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Page{" "}
            <span className="inline-block w-6 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />{" "}
            of{" "}
            <span className="inline-block w-6 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />{" "}
            (
            <span className="inline-block w-8 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />{" "}
            entries)
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function DashboardPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json() as Promise<UsageData>;
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchLogs = async (pageNum: number) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/usage/logs?page=${pageNum}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json: LogsResponse = await res.json();
      setLogs(json.logs);
      setTotalPages(json.pagination.totalPages);
      setPage(json.pagination.page);
    } catch (err: any) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const handlePrev = () => {
    if (page > 1) setPage(page - 1);
  };
  const handleNext = () => {
    if (page < totalPages) setPage(page + 1);
  };

  if (loading) return <DashboardSkeleton />;

  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const { totals, daily, byTask } = data;
  const resetTime = new Date(totals.current_rate_limit_reset * 1000);

  // Animation variants
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const SkeletonRow = () => (
    <motion.tr className="border-b border-gray-200 dark:border-gray-700">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </td>
      ))}
    </motion.tr>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-4">
      <div className="w-full flex justify-between items-center">
        <motion.h1
          className="text-3xl font-bold flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Activity className="w-8 h-8 text-purple-500" />
          AI Usage Dashboard
        </motion.h1>
        <Link
          href="/"
          className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <StatCard
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
            label="Total Requests"
            value={totals.total_requests}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
            label="Total Tokens"
            value={totals.total_tokens}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={<Clock className="w-5 h-5 text-green-500" />}
            label="Remaining Requests"
            value={totals.current_rate_limit_remaining}
            sub={`Resets at ${resetTime.toLocaleTimeString()}`}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            icon={<Layers className="w-5 h-5 text-red-500" />}
            label="Prompt / Completion"
            value={`${totals.total_prompt_tokens || 0} / ${totals.total_completion_tokens || 0}`}
          />
        </motion.div>
      </motion.div>

      {/* Daily Chart */}
      {daily && daily.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold mb-4">
            Daily Tokens (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={daily}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tokens" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Per‑task breakdown */}
      {byTask && byTask.length > 0 && (
        <motion.div
          className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-4">Usage by Task</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {byTask.map((item) => (
              <motion.div
                key={item.task}
                className="flex justify-between p-2 border-b border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="capitalize">{item.task}</span>
                <span className="font-mono">
                  {item.tokens} tokens · {item.requests} req
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Logs Table with Pagination */}
      <motion.div
        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-semibold mb-4">Recent Logs</h2>

        <AnimatePresence mode="wait">
          {logsLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="overflow-x-auto min-h-[800px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Task</th>
                      <th className="px-3 py-2 text-left">Model</th>
                      <th className="px-3 py-2 text-right">Prompt</th>
                      <th className="px-3 py-2 text-right">Completion</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Timestamp</th>
                      <th className="px-3 py-2 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(limit)].map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="logs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="overflow-x-auto min-h-[800px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Task</th>
                      <th className="px-3 py-2 text-left">Model</th>
                      <th className="px-3 py-2 text-right">Prompt</th>
                      <th className="px-3 py-2 text-right">Completion</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Timestamp</th>
                      <th className="px-3 py-2 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {logs.map((log) => (
                      <motion.tr
                        key={log.id}
                        variants={fadeUp}
                        className="border-b border-gray-200 dark:border-gray-700"
                      >
                        <td className="px-3 py-2">{log.id}</td>
                        <td className="px-3 py-2 capitalize">{log.task}</td>
                        <td className="px-3 py-2">{log.model}</td>
                        <td className="px-3 py-2 text-right">
                          {log.prompt_tokens}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {log.completion_tokens}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {log.total_tokens}
                        </td>
                        <td className="px-3 py-2">
                          {formatDate(log.request_timestamp)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {log.rate_limit_remaining}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages} ({logs.length} entries)
          </span>
          <div className="flex gap-2">
            <motion.button
              onClick={handlePrev}
              disabled={page <= 1}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={handleNext}
              disabled={page >= totalPages}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1 }}
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------- StatCard ----------
function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-center gap-3 h-full">
      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">{icon}</div>
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}
