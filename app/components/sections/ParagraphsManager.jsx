"use client";

import { useState, useEffect } from "react";

export default function ParagraphsManager({
  paragraphs,
  setParagraphs,
  categoryKeywords = [],
}) {
  const [newParagraph, setNewParagraph] = useState("");
  const [localParagraphsError, setLocalParagraphsError] = useState("");
  const [keywordCounts, setKeywordCounts] = useState({});
  const [showKeywordStats, setShowKeywordStats] = useState(true);
  // Add these functions inside ParagraphsManager
  const validateParagraph = (text) => {
    if (text.length < 160) {
      return "Paragraph should include as much important detail as possible (minimum 160 characters recommended).";
    }
    return "";
  };

  const addParagraph = () => {
    const validationMsg = validateParagraph(newParagraph);
    if (newParagraph.trim() && !validationMsg.includes("required")) {
      setParagraphs([...paragraphs, newParagraph]);
      setNewParagraph("");
      setLocalParagraphsError("");
    } else if (validationMsg) {
      setLocalParagraphsError(validationMsg);
    }
  };

  const removeParagraph = (index) => {
    setParagraphs(paragraphs.filter((_, i) => i !== index));
  };

  const handleNewParagraphChange = (e) => {
    const value = e.target.value;
    setNewParagraph(value);
    if (value.length > 100) {
      const validationMsg = validateParagraph(value);
      setLocalParagraphsError(validationMsg);
    }
  };
  // Calculate keyword occurrences whenever paragraphs change
  useEffect(() => {
    if (categoryKeywords.length > 0) {
      const allText = paragraphs.join(" ").toLowerCase();
      const counts = {};

      categoryKeywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase();
        const regex = new RegExp(
          `\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "g"
        );
        const matches = allText.match(regex);
        counts[keyword] = matches ? matches.length : 0;
      });

      setKeywordCounts(counts);
    } else {
      setKeywordCounts({});
    }
  }, [paragraphs, categoryKeywords]);

  // Check if at least one keyword is missing
  const hasMissingKeywords =
    categoryKeywords.length > 0 &&
    Object.values(keywordCounts).some((count) => count === 0);
  const totalKeywordCount = Object.values(keywordCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const totalChars = paragraphs.reduce((sum, para) => sum + para.length, 0);
  const avgParaLength =
    paragraphs.length > 0 ? Math.round(totalChars / paragraphs.length) : 0;

  // Check if new paragraph meets minimum requirements
  const isTooShort = newParagraph.length > 0 && newParagraph.length < 160;
  const isGoodLength = newParagraph.length >= 160;

  // Validation rules checker
  const checkValidationRules = () => {
    const rules = [
      {
        id: 1,
        name: "Minimum Paragraphs",
        description: "At least 1 paragraph required",
        check: () => paragraphs.length >= 1,
        importance: "critical",
      },
      {
        id: 2,
        name: "Paragraph Length",
        description: "Each paragraph ≥160 characters",
        check: () =>
          paragraphs.length > 0 && paragraphs.every((p) => p.length >= 160),
        importance: "critical",
      },
      {
        id: 3,
        name: "Category Selected",
        description: "Select a product category first",
        check: () => categoryKeywords.length > 0,
        importance: "critical",
        isCategoryRule: true,
      },
      {
        id: 4,
        name: "Category Keywords",
        description: `Use all category keywords at least once: ${categoryKeywords
          .slice(0, 3)
          .join(", ")}${categoryKeywords.length > 3 ? "..." : ""}`,
        check: () => {
          if (categoryKeywords.length === 0) return false;
          return !hasMissingKeywords;
        },
        importance: "critical",
        condition: categoryKeywords.length > 0,
      },
      {
        id: 5,
        name: "Keyword Density",
        description: "Include each keyword 2-3 times for better SEO",
        check: () => {
          if (categoryKeywords.length === 0) return false;
          const allCounts = Object.values(keywordCounts);
          const avgCount =
            allCounts.reduce((a, b) => a + b, 0) / allCounts.length;
          return avgCount >= 1.5; // Average of 1.5+ counts per keyword
        },
        importance: "medium",
        condition: categoryKeywords.length > 0,
      },
    ];

    return rules;
  };

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
    if (paragraphs.length === 0) {
      return "✗ Add Paragraphs";
    }
    if (!categoryKeywords.length) {
      return "⚠️ Select Category";
    }
    if (hasMissingKeywords) {
      return "⚠️ Missing Keywords";
    }
    if (allRulesPass) {
      return "✓ Description Complete";
    }
    return "⚠️ Needs Attention";
  };

  // Get status badge color
  const getStatusBadgeColor = () => {
    if (paragraphs.length === 0) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    }
    if (!categoryKeywords.length) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
    if (hasMissingKeywords) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
    if (allRulesPass) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  };

  // Get border color based on overall state
  const getBorderColor = () => {
    if (paragraphs.length === 0) {
      return "border-red-400 dark:border-red-500 border-2";
    }
    if (!categoryKeywords.length) {
      return "border-yellow-400 dark:border-yellow-500 border-2";
    }
    if (hasMissingKeywords) {
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
    if (paragraphs.length === 0) return "❌";
    if (!categoryKeywords.length) return "⚠️";
    if (hasMissingKeywords) return "⚠️";
    if (allRulesPass) return "✅";
    return "⚠️";
  };

  // Check if new paragraph meets minimum requirements
  const canAddNewParagraph = newParagraph.trim().length >= 160;

  return (
    <div
      className={`bg-white dark:bg-gray-800 w-full p-4 rounded-lg ${getBorderColor()} transition-all duration-300`}
    >
      {/* Status banner at the top */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Detailed Description
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
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
          <span>
            Paragraphs: <span className="font-medium">{paragraphs.length}</span>
          </span>
          {categoryKeywords.length > 0 && (
            <span>
              Keywords:{" "}
              <span className="font-medium">{totalKeywordCount} total</span>
            </span>
          )}
          <span>
            Avg length:{" "}
            <span className="font-medium">{avgParaLength} chars</span>
          </span>
        </div>
      </div>

      {/* Keyword Usage Statistics - Always show if we have a category */}
      {categoryKeywords.length > 0 && (
        <div
          className={`mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border ${
            hasMissingKeywords
              ? "border-yellow-200 dark:border-yellow-800"
              : "border-gray-200 dark:border-gray-700"
          } transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-black dark:text-gray-100">
              🔍 Keyword Usage ({totalKeywordCount} total)
            </h4>
            <button
              onClick={() => setShowKeywordStats(!showKeywordStats)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {showKeywordStats ? "Hide Details" : "Show Details"}
            </button>
          </div>

          {showKeywordStats ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Include each keyword at least once (ideally 2-3 times each):
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {categoryKeywords.map((keyword, index) => {
                  const count = keywordCounts[keyword] || 0;
                  return (
                    <div
                      key={index}
                      className={`p-2 rounded border text-center transition-all duration-300 ${
                        count === 0
                          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                          : count === 1
                          ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                          : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                      }`}
                    >
                      <div
                        className="font-medium text-sm mb-1 truncate"
                        title={keyword}
                      >
                        {keyword}
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          count === 0
                            ? "text-red-600 dark:text-red-400"
                            : count === 1
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {count}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {count === 0 ? "Missing" : count === 1 ? "Low" : "Good"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMissingKeywords && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                    ⚠️ Missing keywords! Add at least one occurrence of each
                    keyword above.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {hasMissingKeywords ? (
                  <span className="text-red-600 dark:text-red-400">
                    {Object.values(keywordCounts).filter((c) => c === 0).length}{" "}
                    keywords missing
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    All keywords present
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Current Paragraphs */}
      <div className="space-y-3 my-4">
        {paragraphs.length === 0 ? (
          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No paragraphs yet. Add your first paragraph below.
            </p>
          </div>
        ) : (
          paragraphs.map((para, index) => {
            const keywordMatches =
              categoryKeywords.length > 0
                ? categoryKeywords.reduce((acc, keyword) => {
                    const regex = new RegExp(
                      `\\b${keyword.toLowerCase()}\\b`,
                      "gi"
                    );
                    const matches = para.match(regex);
                    return matches ? acc + matches.length : acc;
                  }, 0)
                : 0;

            return (
              <div
                key={index}
                className={`p-3 rounded border transition-all duration-300 ${
                  para.length >= 160
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Paragraph {index + 1} • {para.length} chars
                    </span>
                    {categoryKeywords.length > 0 && keywordMatches > 0 && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          keywordMatches > 2
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                        }`}
                      >
                        {keywordMatches} keyword
                        {keywordMatches !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeParagraph(index)}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                             rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{para}</p>
                {para.length < 160 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center">
                    ⚠️ Needs {160 - para.length} more characters (minimum 160)
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Paragraph */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            Add New Paragraph:
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${
                newParagraph.length === 0
                  ? "text-gray-500 dark:text-gray-400"
                  : newParagraph.length < 160
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {newParagraph.length}/160+ chars
              {newParagraph.length > 0 && newParagraph.length < 160 && (
                <span className="ml-1">
                  (need {160 - newParagraph.length} more)
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-4">
          <div className="w-full">
            <textarea
              value={newParagraph}
              onChange={handleNewParagraphChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 
                       dark:bg-gray-700 dark:text-gray-100
                       ${
                         newParagraph.length === 0
                           ? "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                           : newParagraph.length < 160
                           ? "border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                           : "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400"
                       }`}
              placeholder={
                categoryKeywords.length > 0
                  ? `Write detailed paragraph including keywords: ${categoryKeywords
                      .slice(0, 3)
                      .join(", ")}${
                      categoryKeywords.length > 3 ? "..." : ""
                    } (minimum 160 characters)`
                  : "Write detailed paragraph with specifications, features, and benefits... (minimum 160 characters)"
              }
              rows={3}
            />

            {/* Length indicator bar - Similar to TitleInput */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>0</span>
                <span
                  className={
                    isGoodLength
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : isTooShort && newParagraph.length > 0
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : ""
                  }
                >
                  160 (min)
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  500+ (recommended)
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    isTooShort
                      ? "bg-red-500"
                      : isGoodLength
                      ? "bg-green-500"
                      : newParagraph.length > 0
                      ? "bg-blue-500"
                      : "bg-transparent"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (newParagraph.length / 500) * 100
                    )}%`,
                  }}
                />
                {/* Minimum line indicator */}
                <div
                  className="h-2 w-0.5 bg-gray-400 absolute top-0"
                  style={{
                    left: `${(160 / 500) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                />
                {/* Recommended line indicator */}
                <div
                  className="h-2 w-0.5 bg-green-400 absolute top-0 opacity-50"
                  style={{
                    left: `${(300 / 500) * 100}%`,
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
                      : newParagraph.length >= 300
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }
                >
                  {newParagraph.length >= 300 ? "Excellent!" : "Good length"}
                </span>
                <span
                  className={
                    newParagraph.length >= 300
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }
                >
                  Recommended
                </span>
              </div>
            </div>
            {localParagraphsError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                ⚠️ {localParagraphsError}
              </p>
            )}
          </div>
          <button
            onClick={addParagraph}
            disabled={!canAddNewParagraph}
            className={`w-full md:w-fit px-4 py-2 rounded transition-all duration-300 ${
              canAddNewParagraph
                ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            Add Paragraph
          </button>
        </div>
      </div>

      {/* Validation Rules Section */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-lg text-gray-800 dark:text-gray-100">
            <span className="mr-2">{getHeaderIcon()}</span>
            Description Requirements:
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
                      ❌ Add at least one paragraph above
                    </div>
                  )}
                  {!result && rule.id === 2 && paragraphs.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ Some paragraphs are too short. Each must be at least
                      160 characters.
                    </div>
                  )}
                  {!result && rule.id === 3 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ Select a category from the dropdown above
                    </div>
                  )}
                  {!result && rule.id === 4 && categoryKeywords.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ Missing keywords:{" "}
                      {categoryKeywords
                        .filter(
                          (k) => !keywordCounts[k] || keywordCounts[k] === 0
                        )
                        .join(", ")}
                    </div>
                  )}
                  {!result && rule.id === 5 && categoryKeywords.length > 0 && (
                    <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      ⚠️ Try to use each keyword 2-3 times for better SEO
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
                  {paragraphs.length === 0
                    ? "Add Paragraphs"
                    : !categoryKeywords.length
                    ? "Select Category"
                    : hasMissingKeywords
                    ? "Add Keywords"
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
