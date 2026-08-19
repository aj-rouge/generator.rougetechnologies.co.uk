// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, Zap, Clock, BarChart3, Layers } from "lucide-react";

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

export default function DashboardPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json() as Promise<UsageData>; // ✅ cast to UsageData
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading dashboard…</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  const { totals, daily, byTask } = data;
  const resetTime = new Date(totals.current_rate_limit_reset * 1000);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Activity className="w-8 h-8 text-purple-500" />
        Groq Usage Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
          label="Total Requests"
          value={totals.total_requests}
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
          label="Total Tokens"
          value={totals.total_tokens}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-green-500" />}
          label="Remaining Requests"
          value={totals.current_rate_limit_remaining}
          sub={`Resets at ${resetTime.toLocaleTimeString()}`}
        />
        <StatCard
          icon={<Layers className="w-5 h-5 text-red-500" />}
          label="Prompt / Completion Tokens"
          value={`${totals.total_prompt_tokens || 0} / ${totals.total_completion_tokens || 0}`}
        />
      </div>

      {/* Daily Chart */}
      {daily && daily.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow mb-6">
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
        </div>
      )}

      {/* Per‑task breakdown */}
      {byTask && byTask.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">Usage by Task</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {byTask.map((item) => (
              <div
                key={item.task}
                className="flex justify-between p-2 border-b border-gray-200 dark:border-gray-700"
              >
                <span className="capitalize">{item.task}</span>
                <span className="font-mono">
                  {item.tokens} tokens · {item.requests} req
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-start gap-3">
      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">{icon}</div>
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}
