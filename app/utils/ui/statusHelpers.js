// utils/statusHelpers.js
export const getStatusBadgeColor = (status, validationState = {}) => {
  // Handle predefined statuses
  const statusLower = status.toLowerCase();

  if (
    statusLower.includes("perfect") ||
    statusLower.includes("✅") ||
    statusLower.includes("complete")
  ) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }

  if (
    statusLower.includes("error") ||
    statusLower.includes("❌") ||
    statusLower.includes("mapping error")
  ) {
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }

  if (
    statusLower.includes("warning") ||
    statusLower.includes("⚠️") ||
    statusLower.includes("needs") ||
    statusLower.includes("select")
  ) {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  }

  if (statusLower.includes("set") || statusLower.includes("ready")) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }

  // Default
  return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
};
