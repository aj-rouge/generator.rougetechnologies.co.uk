// utils/validationColors.js

// Centralized color mappings for validation states
export const VALIDATION_COLORS = {
  // Border colors for ValidationWrapper
  border: {
    critical: "border-red-500 dark:border-red-600 border-2",
    warning: "border-yellow-500 dark:border-yellow-600 border-2",
    success: "border-green-500 dark:border-green-600 border-2",
    info: "border-blue-500 dark:border-blue-600 border-2",
    default: "border-gray-300 dark:border-gray-600",
  },

  // Background colors for alerts
  bg: {
    critical: "bg-red-50 dark:bg-red-900/20",
    warning: "bg-yellow-50 dark:bg-yellow-900/20",
    success: "bg-green-50 dark:bg-green-900/20",
    info: "bg-blue-50 dark:bg-blue-900/20",
  },

  // Text colors
  text: {
    critical: "text-red-700 dark:text-red-300",
    warning: "text-yellow-700 dark:text-yellow-300",
    success: "text-green-700 dark:text-green-300",
    info: "text-blue-700 dark:text-blue-300",
  },

  // Icon/emoji for different states
  icon: {
    critical: "❌",
    warning: "⚠️",
    success: "✅",
    info: "ℹ️",
  },
};

// Determine validation status from score
export const getValidationStatus = (score) => {
  if (score === 100) return "success";
  if (score >= 70) return "warning"; // Partial completion
  if (score >= 1) return "warning"; // Some progress
  return "critical"; // 0 score or missing
};

// Get border color based on validation score
export const getBorderColorFromScore = (score) => {
  const status = getValidationStatus(score);
  return VALIDATION_COLORS.border[status];
};

// Get status from validation rules
export const getStatusFromValidation = (
  allRulesPass,
  hasCriticalErrors = false,
) => {
  if (hasCriticalErrors) return "critical";
  if (allRulesPass) return "success";
  return "warning";
};
