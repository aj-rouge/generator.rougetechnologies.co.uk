"use client";

export function LengthIndicatorBar({
  currentLength,
  minLength,
  maxLength,
  recommendedLength,
  showLabels = true,
  customLabels,
  barHeight = "h-2",
  className = "",
  showMinLine = true,
  showRecommendedLine = false,
  showMaxLine = false,
}) {
  // Default labels
  const labels = {
    tooShort: "Too short",
    goodLength: "Good length",
    tooLong: "Too long",
    recommended: "Recommended",
    min: "Min",
    max: "Max",
    ...customLabels,
  };

  // Calculate percentages
  const currentPercentage = maxLength
    ? Math.min(100, (currentLength / maxLength) * 100)
    : Math.min(
        100,
        (currentLength / (recommendedLength || minLength * 3)) * 100,
      );

  const minPercentage = maxLength
    ? (minLength / maxLength) * 100
    : (minLength / (recommendedLength || minLength * 3)) * 100;

  const recommendedPercentage =
    recommendedLength && maxLength
      ? (recommendedLength / maxLength) * 100
      : recommendedLength
        ? (recommendedLength / (recommendedLength * 1.5)) * 100
        : null;

  const maxPercentage = 100;

  // Determine bar color based on current length
  const getBarColor = () => {
    if (maxLength && currentLength > maxLength) {
      return "bg-red-500";
    }
    if (currentLength < minLength) {
      return "bg-red-500";
    }
    if (currentLength >= minLength) {
      return "bg-green-500";
    }
    return "bg-blue-500";
  };

  // Determine text color based on current length
  const getTextColor = () => {
    if (maxLength && currentLength > maxLength) {
      return "text-red-600 dark:text-red-400";
    }
    if (currentLength < minLength) {
      return "text-red-600 dark:text-red-400";
    }
    if (currentLength >= minLength) {
      return "text-green-600 dark:text-green-400";
    }
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Labels above the bar */}
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>0</span>
          {showMinLine && (
            <span
              className={
                currentLength >= minLength
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : currentLength > 0 && currentLength < minLength
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : ""
              }
            >
              {minLength} {labels.min && `(${labels.min})`}
            </span>
          )}
          {showRecommendedLine && recommendedLength && (
            <span
              className={
                currentLength >= recommendedLength
                  ? "text-green-600 dark:text-green-400"
                  : ""
              }
            >
              {recommendedLength}{" "}
              {labels.recommended && `(${labels.recommended})`}
            </span>
          )}
          {showMaxLine && maxLength && (
            <span
              className={
                currentLength <= maxLength && currentLength >= minLength
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : currentLength > maxLength
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : ""
              }
            >
              {maxLength} {labels.max && `(${labels.max})`}
            </span>
          )}
          {!showMaxLine && maxLength && (
            <span>
              {maxLength} {labels.max && `(${labels.max})`}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={`w-full ${barHeight} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative`}
      >
        {/* Main progress bar */}
        <div
          className={`h-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${currentPercentage}%` }}
        />

        {/* Minimum line indicator */}
        {showMinLine && (
          <div
            className="h-full w-0.5 bg-gray-400 absolute top-0"
            style={{
              left: `${minPercentage}%`,
              transform: "translateX(-50%)",
            }}
          />
        )}

        {/* Recommended line indicator */}
        {showRecommendedLine && recommendedPercentage && (
          <div
            className="h-full w-0.5 bg-green-400 absolute top-0 opacity-50"
            style={{
              left: `${recommendedPercentage}%`,
              transform: "translateX(-50%)",
            }}
          />
        )}
      </div>

      {/* Labels below the bar */}
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{labels.tooShort}</span>
          <span
            className={
              currentLength >= minLength &&
              (!maxLength || currentLength <= maxLength)
                ? "text-green-600 dark:text-green-400 font-medium"
                : ""
            }
          >
            {labels.goodLength}
          </span>
          {(maxLength || labels.tooLong) && <span>{labels.tooLong}</span>}
        </div>
      )}

      {/* Current length text */}
      <div className="mt-1 text-sm">
        <span className={getTextColor()}>
          {currentLength}
          {maxLength ? `/${maxLength} characters` : " characters"}
          {currentLength < minLength && (
            <span className="ml-1">
              (need {minLength - currentLength} more)
            </span>
          )}
          {maxLength && currentLength > maxLength && (
            <span className="ml-1">({currentLength - maxLength} over)</span>
          )}
        </span>
      </div>
    </div>
  );
}