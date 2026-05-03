// utils/statusHelpers.js
export const getStatusBadgeColorFromState = ({
  hasCriticalError = false,
  hasWarning = false,
  isComplete = false,
} = {}) => {
  if (hasCriticalError) {
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }
  if (hasWarning) {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  }
  if (isComplete) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
};
