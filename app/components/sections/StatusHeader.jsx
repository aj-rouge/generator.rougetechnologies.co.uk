// components/StatusHeader.jsx
"use client";

import { getStatusBadgeColor } from "../../utils/ui/statusHelpers";

export function StatusHeader({
  title,
  status,
  statusColor, // Optional - can be provided or auto-generated
  rulesPassed = 0,
  totalRules = 0,
  subtitle = null,
  severity = "auto", // "success", "warning", "error", "info", "auto"
}) {
  // Auto-generate color if not provided
  const badgeColor = statusColor || getStatusBadgeColor(status, { severity });

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </h3>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${badgeColor}`}
          >
            {status}
          </span>
          {totalRules > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {rulesPassed}/{totalRules} rules
            </div>
          )}
        </div>
      </div>
      {subtitle && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}
