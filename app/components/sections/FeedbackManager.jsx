"use client";

import { useState, useEffect } from "react";
import { DEFAULT_FEEDBACKS } from "../../data/feedbacks";

export default function FeedbackManager({ feedbacks, setFeedbacks }) {
  const [newFeedbackName, setNewFeedbackName] = useState("");
  const [newFeedbackCount, setNewFeedbackCount] = useState("1");
  const [newFeedbackContent, setNewFeedbackContent] = useState("");
  const [localFeedbackError, setLocalFeedbackError] = useState("");
  // Default feedbacks (hardcoded as requested)
  // Set default feedbacks on first render ONLY
  useEffect(() => {
    if (feedbacks.length === 0) {
      setFeedbacks(DEFAULT_FEEDBACKS);
      setLocalFeedbackError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set default feedbacks
  const setDefaultFeedbacks = () => {
    setFeedbacks(DEFAULT_FEEDBACKS);
    setLocalFeedbackError("");
  };

  // Add a new feedback item
  const addFeedback = () => {
    if (newFeedbackName.trim() && newFeedbackContent.trim()) {
      const feedbackCount = parseInt(newFeedbackCount) || 1;

      setFeedbacks([
        ...feedbacks,
        {
          name: newFeedbackName.trim(),
          count: feedbackCount,
          content: newFeedbackContent.trim(),
        },
      ]);

      // Clear inputs
      setNewFeedbackName("");
      setNewFeedbackCount("1");
      setNewFeedbackContent("");
      setLocalFeedbackError("");
    } else {
      setLocalFeedbackError("Please fill in all fields");
    }
  };

  // Remove a feedback item
  const removeFeedback = (index) => {
    setFeedbacks(feedbacks.filter((_, i) => i !== index));
  };

  // Clear all feedbacks
  const clearAllFeedbacks = () => {
    setFeedbacks([]);
    setLocalFeedbackError("");
  };

  // Validation rules checker
  const checkValidationRules = () => {
    const rules = [
      {
        id: 1,
        name: "Minimum Feedback Items",
        description: "At least 4 feedback items recommended",
        check: () => feedbacks.length >= 4,
        importance: "critical",
      },
      {
        id: 2,
        name: "Feedback Format",
        description: "Use anonymized names (e***e, d***d, 6***-)",
        check: () =>
          feedbacks.length === 0 ||
          feedbacks.every(
            (f) => f.name && /[a-z0-9]\*\*\*[a-z0-9\-]/.test(f.name)
          ),
        importance: "critical",
        condition: feedbacks.length > 0,
      },
      {
        id: 3,
        name: "Feedback Content Length",
        description: "Each feedback at least 100 characters",
        check: () =>
          feedbacks.length === 0 ||
          feedbacks.every((f) => f.content && f.content.trim().length >= 100),
        importance: "medium",
        condition: feedbacks.length > 0,
      },
      {
        id: 4,
        name: "Feedback Count",
        description: "Include feedback count in parentheses (e.g., 202)",
        check: () =>
          feedbacks.length === 0 ||
          feedbacks.every(
            (f) => f.count && typeof f.count === "number" && f.count > 0
          ),
        importance: "critical",
        condition: feedbacks.length > 0,
      },
      {
        id: 5,
        name: "Feedback Variety",
        description: "Mix of different customer names",
        check: () => {
          if (feedbacks.length < 2) return true;
          const uniqueNames = new Set(feedbacks.map((f) => f.name));
          return uniqueNames.size >= Math.min(2, feedbacks.length);
        },
        importance: "medium",
        condition: feedbacks.length >= 2,
      },
    ];

    return rules;
  };

  // Check if new feedback content meets minimum requirements
  const isTooShort =
    newFeedbackContent.length > 0 && newFeedbackContent.length < 100;
  const isGoodLength = newFeedbackContent.length >= 100;

  const validationRules = checkValidationRules();
  const displayRules = validationRules.filter(
    (rule) => rule.condition !== false
  );
  const passedRules = displayRules.filter(
    (rule) => rule.check() === true
  ).length;
  const totalRules = displayRules.length;
  const allRulesPass = passedRules === totalRules && totalRules > 0;
  const validationScore =
    totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;

  // Get overall status
  const getOverallStatus = () => {
    if (feedbacks.length === 0) {
      return "✗ Add Feedback";
    }
    if (feedbacks.length < 4) {
      return `⚠️ ${feedbacks.length}/4`;
    }
    if (allRulesPass) {
      return "✓ Feedback Complete";
    }
    return "⚠️ Needs Attention";
  };

  // Get status badge color
  const getStatusBadgeColor = () => {
    if (feedbacks.length === 0) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    }
    if (feedbacks.length < 4) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
    if (allRulesPass) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  };

  // Get border color based on overall state
  const getBorderColor = () => {
    if (feedbacks.length === 0) {
      return "border-red-400 dark:border-red-500 border-2";
    }
    if (feedbacks.length < 4) {
      return "border-yellow-400 dark:border-yellow-500 border-2";
    }
    if (allRulesPass) {
      return "border-green-500 dark:border-green-500 border-2";
    }
    return "border-gray-300 dark:border-gray-600";
  };

  // Get importance badge color
  const getImportanceColor = (importance) => {
    switch (importance) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  // Get validation status color
  const getValidationColor = (score) => {
    if (score === 100) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get header icon based on validation status
  const getHeaderIcon = () => {
    if (feedbacks.length === 0) return "❌";
    if (feedbacks.length < 4) return "⚠️";
    if (allRulesPass) return "✅";
    return "⚠️";
  };

  // Calculate feedback statistics
  const getFeedbackStats = () => {
    if (feedbacks.length === 0) return null;

    const totalCount = feedbacks.reduce((sum, f) => sum + f.count, 0);
    const averageCount = Math.round(totalCount / feedbacks.length);
    const shortFeedbacks = feedbacks.filter(
      (f) => f.content.length < 100
    ).length;

    return {
      totalFeedbacks: feedbacks.length,
      totalCount,
      averageCount,
      shortFeedbacks,
    };
  };

  const stats = getFeedbackStats();

  // Check if new feedback can be added
  const canAddNewFeedback =
    newFeedbackName.trim().length > 0 && newFeedbackContent.trim().length > 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 w-full p-4 rounded-lg ${getBorderColor()} transition-all duration-300`}
    >
      {/* Status banner at the top */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Customer Feedback
          </h3>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusBadgeColor()}`}
            >
              {getOverallStatus()}
            </span>
            {displayRules.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {passedRules}/{totalRules} rules
              </div>
            )}
          </div>
        </div>
        {stats && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
            <span>
              Items:{" "}
              <span className="font-medium">{stats.totalFeedbacks}/4 min</span>
            </span>
            <span>
              Total Count:{" "}
              <span className="font-medium">{stats.totalCount}</span>
            </span>
            {stats.shortFeedbacks > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">
                ⚠️ {stats.shortFeedbacks} short feedbacks
              </span>
            )}
          </div>
        )}
      </div>

      {/* Current feedbacks */}
      <div className="space-y-3 my-4">
        {feedbacks.length > 0 ? (
          feedbacks.map((feedback, index) => {
            const isShort = feedback.content.length < 100;

            return (
              <div
                key={index}
                className={`p-3 rounded border transition-all duration-300 ${
                  isShort
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                } hover:border-blue-300 dark:hover:border-blue-600`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {feedback.name} ({feedback.count})
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      • Item {index + 1}
                    </span>
                    {isShort && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                        Short
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeFeedback(index)}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                             rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  {feedback.content}
                </p>
                {isShort && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center">
                    ⚠️ Consider adding more detail (
                    {100 - feedback.content.length} more chars needed)
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              No feedback items added yet. Add at least 4 for best results.
            </p>
            <button
              onClick={setDefaultFeedbacks}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            >
              Set Default Feedbacks
            </button>
          </div>
        )}
      </div>

      {/* Add new feedback form */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            Add New Feedback:
          </label>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {feedbacks.length}/4 minimum
          </span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Feedback Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={newFeedbackName}
                onChange={(e) => setNewFeedbackName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                         dark:bg-gray-700 dark:text-gray-100"
                placeholder="e.g., e***e"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Format: initials with *** (e***e, d***d, 6***-)
              </p>
            </div>

            {/* Feedback Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feedback Count
              </label>
              <input
                type="number"
                value={newFeedbackCount}
                onChange={(e) => setNewFeedbackCount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                         rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                         dark:bg-gray-700 dark:text-gray-100"
                placeholder="e.g., 202"
                min="1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of feedbacks given by this customer
              </p>
            </div>
          </div>

          {/* Feedback Content with Length Indicator Bar */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Feedback Content
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm ${
                    newFeedbackContent.length === 0
                      ? "text-gray-500 dark:text-gray-400"
                      : isTooShort
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {newFeedbackContent.length}/100+ chars
                  {isTooShort && (
                    <span className="ml-1">
                      (need {100 - newFeedbackContent.length} more)
                    </span>
                  )}
                </span>
              </div>
            </div>
            <textarea
              value={newFeedbackContent}
              onChange={(e) => setNewFeedbackContent(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 
                       dark:bg-gray-700 dark:text-gray-100
                       ${
                         newFeedbackContent.length === 0
                           ? "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                           : isTooShort
                           ? "border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                           : "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400"
                       }`}
              placeholder="Write positive customer feedback about the product or service..."
              rows={3}
            />

            {/* Length indicator bar - Similar to ParagraphsManager */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>0</span>
                <span
                  className={
                    isGoodLength
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : isTooShort && newFeedbackContent.length > 0
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : ""
                  }
                >
                  100 (min)
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  200+ (recommended)
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    isTooShort
                      ? "bg-red-500"
                      : isGoodLength
                      ? "bg-green-500"
                      : newFeedbackContent.length > 0
                      ? "bg-blue-500"
                      : "bg-transparent"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (newFeedbackContent.length / 300) * 100
                    )}%`,
                  }}
                />
                {/* Minimum line indicator */}
                <div
                  className="h-2 w-0.5 bg-gray-400 absolute top-0"
                  style={{
                    left: `${(100 / 300) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                />
                {/* Recommended line indicator */}
                <div
                  className="h-2 w-0.5 bg-green-400 absolute top-0 opacity-50"
                  style={{
                    left: `${(200 / 300) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Too short</span>
                <span
                  className={
                    isGoodLength
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : newFeedbackContent.length >= 200
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }
                >
                  {newFeedbackContent.length >= 200
                    ? "Excellent!"
                    : "Good length"}
                </span>
                <span
                  className={
                    newFeedbackContent.length >= 200
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }
                >
                  Recommended
                </span>
              </div>
            </div>

            {newFeedbackContent.length > 0 &&
              newFeedbackContent.length < 100 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center">
                  ⚠️ Add more detail to make feedback convincing (need{" "}
                  {100 - newFeedbackContent.length} more chars)
                </p>
              )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={addFeedback}
              disabled={!canAddNewFeedback}
              className={`flex-1 px-4 py-3 rounded-lg transition-all duration-300 ${
                canAddNewFeedback
                  ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white shadow-md"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {canAddNewFeedback ? "+ Add Feedback" : "Enter name and content"}
            </button>

            <div className="flex gap-3">
              <button
                onClick={setDefaultFeedbacks}
                className="px-4 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              >
                Set Defaults
              </button>
              {feedbacks.length > 0 && (
                <button
                  onClick={clearAllFeedbacks}
                  className="px-4 py-3 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Show local error message */}
        {localFeedbackError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              ⚠️ {localFeedbackError}
            </p>
          </div>
        )}
      </div>

      {/* Validation Rules Section */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-lg text-gray-800 dark:text-gray-100">
            <span className="mr-2">{getHeaderIcon()}</span>
            Feedback Requirements:
          </p>
        </div>

        <div className="space-y-2">
          {displayRules.map((rule) => {
            const result = rule.check();

            return (
              <div
                key={rule.id}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="mt-1">
                  {result ? (
                    <span className="text-green-600 dark:text-green-400">
                      ✓
                    </span>
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
                        rule.importance
                      )}`}
                    >
                      {rule.importance}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {rule.description}
                  </p>
                  {!result && rule.id === 1 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ Need {4 - feedbacks.length} more feedback items
                    </div>
                  )}
                  {!result && rule.id === 2 && feedbacks.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ Use anonymized format: e***e, d***d, 6***-
                    </div>
                  )}
                  {!result && rule.id === 3 && feedbacks.length > 0 && (
                    <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      ⚠️ Some feedbacks are too short (min 100 chars)
                    </div>
                  )}
                  {!result && rule.id === 4 && feedbacks.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ All feedbacks must have a count number
                    </div>
                  )}
                  {!result && rule.id === 5 && feedbacks.length >= 2 && (
                    <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      ⚠️ Try to use different customer names
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
                    className={`h-full transition-all duration-500 ${
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
                  {feedbacks.length === 0
                    ? "Add Feedback"
                    : feedbacks.length < 4
                    ? `${feedbacks.length}/4 Items`
                    : allRulesPass
                    ? "Perfect!"
                    : "Almost there!"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
