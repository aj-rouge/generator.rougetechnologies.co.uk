"use client";

import { useState, useEffect } from "react";
import { DEFAULT_FEEDBACKS } from "../../data/feedbacks";
import CollapsibleStatusHeader from "./CollapsibleStatusHeader";
import { getStatusBadgeColorFromState } from "../../utils/ui/statusHelpers";
import { ValidationRules } from "./ValidationRules";

export default function FeedbackManager({ feedbacks, setFeedbacks }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newFeedbackName, setNewFeedbackName] = useState("");
  const [newFeedbackCount, setNewFeedbackCount] = useState("1");
  const [newFeedbackContent, setNewFeedbackContent] = useState("");
  const [localFeedbackError, setLocalFeedbackError] = useState("");

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
      setNewFeedbackName("");
      setNewFeedbackCount("1");
      setNewFeedbackContent("");
      setLocalFeedbackError("");
    } else {
      setLocalFeedbackError("Please fill in all fields");
    }
  };

  // Clear all feedbacks
  const clearAllFeedbacks = () => {
    setFeedbacks([]);
    setLocalFeedbackError("");
  };

  // Validation rules
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
            (f) => f.name && /[a-z0-9]\*\*\*[a-z0-9\-]/.test(f.name),
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
            (f) => f.count && typeof f.count === "number" && f.count > 0,
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

  const isTooShort =
    newFeedbackContent.length > 0 && newFeedbackContent.length < 100;
  const isGoodLength = newFeedbackContent.length >= 100;

  const validationRules = checkValidationRules();
  const displayRules = validationRules.filter(
    (rule) => rule.condition !== false,
  );
  const passedRules = displayRules.filter(
    (rule) => rule.check() === true,
  ).length;
  const totalRules = displayRules.length;
  const allRulesPass = passedRules === totalRules && totalRules > 0;
  const validationScore =
    totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;

  const getOverallStatus = () => {
    if (feedbacks.length === 0) return "Add Feedback";
    if (feedbacks.length < 4) return `${feedbacks.length}/4 Items`;
    if (allRulesPass) return "Perfect!";
    return "Almost there!";
  };

  const badgeColor = getStatusBadgeColorFromState({
    hasCriticalError: feedbacks.length === 0,
    hasWarning: feedbacks.length > 0 && (feedbacks.length < 4 || !allRulesPass),
    isComplete: allRulesPass,
  });

  const getBorderColor = () => {
    if (feedbacks.length === 0)
      return "border-red-400 dark:border-red-500 border-2";
    if (feedbacks.length < 4)
      return "border-yellow-400 dark:border-yellow-500 border-2";
    if (allRulesPass) return "border-green-500 dark:border-green-500 border-2";
    return "border-gray-300 dark:border-gray-600";
  };

  // Header icon logic (used only for the ValidationRules component)
  const getHeaderIcon = () => {
    if (feedbacks.length === 0) return "❌";
    if (feedbacks.length < 4) return "⚠️";
    if (allRulesPass) return "✅";
    return "⚠️";
  };

  const getFeedbackStats = () => {
    if (feedbacks.length === 0) return null;
    const totalCount = feedbacks.reduce((sum, f) => sum + f.count, 0);
    const shortFeedbacks = feedbacks.filter(
      (f) => f.content.length < 100,
    ).length;
    return {
      totalFeedbacks: feedbacks.length,
      totalCount,
      shortFeedbacks,
    };
  };

  const stats = getFeedbackStats();
  const canAddNewFeedback =
    newFeedbackName.trim().length > 0 && newFeedbackContent.trim().length > 0;

  // Build subtitle for collapsed header
  const subtitle = stats ? (
    <div className="flex flex-wrap gap-4">
      <span>
        Items: <span className="font-medium">{stats.totalFeedbacks}/4 min</span>
      </span>
      <span>
        Total Count: <span className="font-medium">{stats.totalCount}</span>
      </span>
      {stats.shortFeedbacks > 0 && (
        <span className="text-yellow-600 dark:text-yellow-400">
          ⚠️ {stats.shortFeedbacks} short feedbacks
        </span>
      )}
    </div>
  ) : null;

  return (
    <div
      className={`bg-white dark:bg-gray-800 w-full p-4 rounded-lg ${getBorderColor()} transition-all duration-300`}
    >
      <CollapsibleStatusHeader
        title="Customer Feedback"
        status={getOverallStatus()}
        statusColor={badgeColor}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle={subtitle}
        collapsible
        isOpen={isOpen}
        onToggle={setIsOpen}
        chevronPosition="right"
      >
        {/* Dropdown content – same as before */}
        <div className="space-y-3 my-4 max-h-96 overflow-y-auto">
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
                      onClick={() =>
                        setFeedbacks(feedbacks.filter((_, i) => i !== index))
                      }
                      className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm transition-colors"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={newFeedbackName}
                  onChange={(e) => setNewFeedbackName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g., e***e"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Format: initials with *** (e***e, d***d, 6***-)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Feedback Count
                </label>
                <input
                  type="number"
                  value={newFeedbackCount}
                  onChange={(e) => setNewFeedbackCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g., 202"
                  min="1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of feedbacks given by this customer
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Feedback Content
                </label>
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
              <textarea
                value={newFeedbackContent}
                onChange={(e) => setNewFeedbackContent(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-gray-100 ${
                  newFeedbackContent.length === 0
                    ? "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                    : isTooShort
                      ? "border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                      : "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400"
                }`}
                placeholder="Write positive customer feedback about the product or service..."
                rows={3}
              />

              {/* length indicator bar */}
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
                      width: `${Math.min(100, (newFeedbackContent.length / 300) * 100)}%`,
                    }}
                  />
                  <div
                    className="h-2 w-0.5 bg-gray-400 absolute top-0"
                    style={{
                      left: `${(100 / 300) * 100}%`,
                      transform: "translateX(-50%)",
                    }}
                  />
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
                {canAddNewFeedback
                  ? "+ Add Feedback"
                  : "Enter name and content"}
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

          {localFeedbackError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">
                ⚠️ {localFeedbackError}
              </p>
            </div>
          )}
        </div>

        {/* ========== REPLACED VALIDATION RULES SECTION ========== */}
        <ValidationRules
          rules={displayRules}
          headerIcon={getHeaderIcon()}
          headerText="Feedback Requirements:"
          validationScore={validationScore}
          allRulesPass={allRulesPass}
          passedRules={passedRules}
          totalRules={totalRules}
          overallStatusMessage={getOverallStatus()}
        />
      </CollapsibleStatusHeader>
    </div>
  );
}
