"use client";

import {
  getImportanceColor,
  getValidationColor,
} from "../../utils/ui/validationHelpers";

export function ValidationRules({
  rules,
  headerIcon = "⚠️",
  headerText = "Requirements",
  validationScore = 0,
  allRulesPass = false,
  passedRules = 0,
  totalRules = 0,
  overallStatusMessage = "",
}) {
  return (
    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-lg text-gray-800 dark:text-gray-100">
          <span className="mr-2">{headerIcon}</span>
          {headerText}:
        </p>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => {
          const result = rule.check();

          return (
            <div
              key={rule.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="mt-1">
                {result ? (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">✗</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                    {rule.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${getImportanceColor(
                      rule.importance,
                    )}`}
                  >
                    {rule.importance}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {rule.description}
                </p>
                {!result && rule.errorMessage && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {rule.errorMessage}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalRules > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress:
              <span className={`ml-2 ${getValidationColor(validationScore)}`}>
                {validationScore}%
              </span>
            </span>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    allRulesPass
                      ? "bg-green-500"
                      : passedRules > 0
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${validationScore}%` }}
                />
              </div>
              <span
                className={`text-sm ${getValidationColor(validationScore)}`}
              >
                {overallStatusMessage}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
