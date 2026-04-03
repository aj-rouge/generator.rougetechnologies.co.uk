"use client";
import { CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

export default function ToastItem({ message, type = "success", progress = 0 }) {
  const configs = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/40",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-800 dark:text-blue-300",
      bar: "bg-blue-500",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/40",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-800 dark:text-green-300",
      bar: "bg-green-500",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/40",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-800 dark:text-red-300",
      bar: "bg-red-500",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  const current = configs[type] || configs.success;

  return (
    <div
      className={`
        w-full border rounded-xl shadow-lg overflow-hidden
        ${current.bg} ${current.text} ${current.border}
        animate-in slide-in-from-right-5 fade-in duration-300
      `}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5">{current.icon}</span>
          <span className="font-medium text-sm">{message}</span>
        </div>
        <X className="w-4 h-4 opacity-40 hover:opacity-100 transition" />
      </div>

      {type === "info" && (
        <div className="w-full h-1 bg-gray-200/50 dark:bg-gray-800/50">
          <div
            className={`h-full ${current.bar} transition-all duration-500 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
