// app/components/SaveNotification.jsx
"use client";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SaveNotification = ({ message, type = "success", progress = 0 }) => {
  const configs = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-800 dark:text-blue-300",
      bar: "bg-blue-500",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-800 dark:text-green-300",
      bar: "bg-green-500",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
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
        w-full border rounded-xl shadow-sm overflow-hidden
        ${current.bg} ${current.text} ${current.border}
        transition-all duration-300 ease-in-out
      `}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {current.icon}
          <span className="font-medium text-sm leading-none">{message}</span>
        </div>

        {type === "info" && progress > 0 && (
          <span className="text-[10px] font-mono font-bold opacity-60">
            {progress}%
          </span>
        )}
      </div>

      {/* The Progress Bar */}
      {type === "info" && (
        <div className="w-full h-1 bg-gray-200/50 dark:bg-gray-800/50">
          <div
            className={`h-full ${current.bar} transition-all duration-500 ease-out relative`}
            style={{ width: `${progress}%` }}
          >
            {/* Glossy pulse effect */}
            <div className="absolute inset-0 w-full h-full animate-pulse bg-white/20" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveNotification;
