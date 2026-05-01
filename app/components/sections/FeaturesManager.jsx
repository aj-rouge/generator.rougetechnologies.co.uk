"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, X } from "lucide-react";

// ----- Helper functions for text cleaning -----
const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const removeDoubleColon = (str) => {
  if (!str) return str;
  return str.replace(/:/g, "");
};

const ensureEndsWithPeriod = (str) => {
  if (!str) return str;
  const trimmed = str.trim();
  if (trimmed.length === 0) return str;
  const lastChar = trimmed.charAt(trimmed.length - 1);
  if (".!?".includes(lastChar)) return trimmed;
  return trimmed + ".";
};

// ----- Main component -----
export default function FeaturesManager({
  features,
  setFeatures,
  categoryKeywords = [],
}) {
  const [newFeatureTitle, setNewFeatureTitle] = useState("");
  const [newFeatureDesc, setNewFeatureDesc] = useState("");
  const [localFeaturesError, setLocalFeaturesError] = useState("");
  const [showKeywordStats, setShowKeywordStats] = useState(true);
  const [keywordCounts, setKeywordCounts] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  // Clean features on initial load (auto‑capitalize, remove ::, add period)
  useEffect(() => {
    const cleaned = features.map((f) => ({
      title: capitalizeFirstLetter(removeDoubleColon(f.title?.trim() || "")),
      description: ensureEndsWithPeriod(
        capitalizeFirstLetter(removeDoubleColon(f.description?.trim() || "")),
      ),
    }));
    if (JSON.stringify(cleaned) !== JSON.stringify(features)) {
      setFeatures(cleaned);
    }
  }, []);

  // Cancel edit mode and clear inputs
  const cancelEdit = () => {
    setEditingIndex(null);
    setNewFeatureTitle("");
    setNewFeatureDesc("");
  };

  // Add or update feature with automatic cleaning
  const addOrUpdateFeature = () => {
    const rawTitle = newFeatureTitle.trim();
    const rawDesc = newFeatureDesc.trim();

    if (rawTitle && rawDesc) {
      const cleanedTitle = capitalizeFirstLetter(removeDoubleColon(rawTitle));
      const cleanedDesc = ensureEndsWithPeriod(
        capitalizeFirstLetter(removeDoubleColon(rawDesc)),
      );

      if (editingIndex !== null) {
        const updatedFeatures = [...features];
        updatedFeatures[editingIndex] = {
          title: cleanedTitle,
          description: cleanedDesc,
        };
        setFeatures(updatedFeatures);
        cancelEdit();
      } else {
        setFeatures([
          ...features,
          {
            title: cleanedTitle,
            description: cleanedDesc,
          },
        ]);
        setNewFeatureTitle("");
        setNewFeatureDesc("");
      }
      validateFeatures();
    }
  };

  const removeFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
    if (editingIndex === index) {
      cancelEdit();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    validateFeatures();
  };

  const editFeature = (index) => {
    const feature = features[index];
    setNewFeatureTitle(feature.title);
    setNewFeatureDesc(feature.description);
    setEditingIndex(index);
  };

  const validateFeatures = () => {
    if (features.length < 1) {
      setLocalFeaturesError(
        `Minimum 1 feature required. Currently have ${features.length}`,
      );
      return false;
    }
    setLocalFeaturesError("");
    return true;
  };

  // Calculate keyword occurrences whenever features change
  useEffect(() => {
    if (categoryKeywords.length > 0) {
      const allText = features
        .map((f) => `${f.title} ${f.description}`)
        .join(" ")
        .toLowerCase();
      const counts = {};

      categoryKeywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase();
        const regex = new RegExp(
          `\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "g",
        );
        const matches = allText.match(regex);
        counts[keyword] = matches ? matches.length : 0;
      });

      setKeywordCounts(counts);
    } else {
      setKeywordCounts({});
    }
  }, [features, categoryKeywords]);

  // Update local error based on features count
  useEffect(() => {
    if (features.length < 1) {
      setLocalFeaturesError(
        `Minimum 1 feature required. Currently have ${features.length}`,
      );
    } else {
      setLocalFeaturesError("");
    }
  }, [features.length]);

  // Check if at least one keyword is missing
  const hasMissingKeywords =
    categoryKeywords.length > 0 &&
    Object.values(keywordCounts).some((count) => count === 0);
  const totalKeywordCount = Object.values(keywordCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Validation rules checker – minimum features changed to 1
  const checkValidationRules = () => {
    const rules = [
      {
        id: 1,
        name: "Minimum Features",
        description: "At least 1 feature required",
        check: () => features.length >= 1,
        importance: "critical",
      },
      {
        id: 2,
        name: "Feature Titles",
        description: "Each feature must have a title",
        check: () =>
          features.length === 0
            ? false
            : features.every((f) => f.title?.trim().length > 0),
        importance: "critical",
        condition: features.length > 0,
      },
      {
        id: 3,
        name: "Feature Descriptions",
        description: "Each feature must have a description",
        check: () =>
          features.length === 0
            ? false
            : features.every((f) => f.description?.trim().length > 0),
        importance: "critical",
        condition: features.length > 0,
      },
      {
        id: 4,
        name: "Category Selected",
        description: "Select a product category first",
        check: () => categoryKeywords.length > 0,
        importance: "critical",
        isCategoryRule: true,
      },
      {
        id: 5,
        name: "Keyword Usage",
        description: `Use category keywords in features: ${categoryKeywords
          .slice(0, 3)
          .join(", ")}${categoryKeywords.length > 3 ? "..." : ""}`,
        check: () => {
          if (categoryKeywords.length === 0 || features.length === 0)
            return false;
          return !hasMissingKeywords;
        },
        importance: "medium",
        condition: categoryKeywords.length > 0 && features.length > 0,
      },
      {
        id: 6,
        name: "Feature Variety",
        description: "Features should cover different aspects",
        check: () => {
          if (features.length < 2) return true; // Not applicable for single feature
          const uniqueStarts = new Set(
            features.map((f) => f.title.split(" ")[0].toLowerCase()),
          );
          return uniqueStarts.size >= Math.min(2, features.length);
        },
        importance: "medium",
        condition: features.length >= 2,
      },
    ];

    return rules;
  };

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
    if (features.length === 0) return "✗ Add Features";
    if (features.length < 1) return `⚠️ ${features.length}/1`;
    if (!categoryKeywords.length) return "⚠️ Select Category";
    if (hasMissingKeywords) return "⚠️ Missing Keywords";
    if (allRulesPass) return "✓ Features Complete";
    return "⚠️ Needs Attention";
  };

  const getStatusBadgeColor = () => {
    if (features.length === 0)
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (features.length < 1)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (!categoryKeywords.length)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (hasMissingKeywords)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (allRulesPass)
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  };

  const getBorderColor = () => {
    if (features.length === 0)
      return "border-red-400 dark:border-red-500 border-2";
    if (features.length < 1)
      return "border-yellow-400 dark:border-yellow-500 border-2";
    if (!categoryKeywords.length)
      return "border-yellow-400 dark:border-yellow-500 border-2";
    if (hasMissingKeywords)
      return "border-yellow-400 dark:border-yellow-500 border-2";
    if (allRulesPass) return "border-green-500 dark:border-green-500 border-2";
    return "border-gray-300 dark:border-gray-600";
  };

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

  const getValidationColor = (score) => {
    if (score === 100) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHeaderIcon = () => {
    if (features.length === 0) return "❌";
    if (features.length < 1) return "⚠️";
    if (!categoryKeywords.length) return "⚠️";
    if (hasMissingKeywords) return "⚠️";
    if (allRulesPass) return "✅";
    return "⚠️";
  };

  const canAddOrUpdate =
    newFeatureTitle.trim().length > 0 && newFeatureDesc.trim().length > 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 w-full p-4 rounded-lg ${getBorderColor()} transition-all duration-300`}
    >
      {/* Status banner */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Product Features
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
            Features:{" "}
            <span className="font-medium">{features.length}/1 min</span>
          </span>
          {categoryKeywords.length > 0 && (
            <span>
              Keywords:{" "}
              <span className="font-medium">{totalKeywordCount} total</span>
            </span>
          )}
        </div>
      </div>

      {/* Keyword Usage Statistics (unchanged) */}
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
              🔍 Keyword Usage in Features ({totalKeywordCount} total)
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
                Include category keywords in your features for better SEO:
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryKeywords.map((keyword, index) => {
                  const count = keywordCounts[keyword] || 0;
                  return (
                    <span
                      key={index}
                      className={`px-3 py-1.5 rounded-full border text-sm ${
                        count === 0
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                          : count === 1
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
                            : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700"
                      }`}
                    >
                      {keyword}: {count}
                    </span>
                  );
                })}
              </div>
              {hasMissingKeywords && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                    ⚠️ Missing keywords! Try to include each keyword at least
                    once in your features.
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

      {/* Current Features */}
      <div className="space-y-3 my-4">
        {features.length === 0 ? (
          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No features yet. Add your first feature below.
            </p>
          </div>
        ) : (
          features.map((feature, index) => {
            const keywordMatches =
              categoryKeywords.length > 0
                ? categoryKeywords.reduce((acc, keyword) => {
                    const regex = new RegExp(
                      `\\b${keyword.toLowerCase()}\\b`,
                      "gi",
                    );
                    const text = `${feature.title} ${feature.description}`;
                    const matches = text.match(regex);
                    return matches ? acc + matches.length : acc;
                  }, 0)
                : 0;

            const isEditingThis = editingIndex === index;

            return (
              <div
                key={index}
                className={`p-3 rounded border transition-all duration-300 ${
                  isEditingThis
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Feature {index + 1}
                    </span>
                    {keywordMatches > 0 && (
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
                    {isEditingThis && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        (editing)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editFeature(index)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-sm transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => removeFeature(index)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong className="text-blue-600 dark:text-blue-400">
                    {feature.title}:
                  </strong>{" "}
                  {feature.description}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Feature Form */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            {editingIndex !== null ? "Edit Feature:" : "Add New Feature:"}
          </label>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {features.length}/1 minimum
          </span>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={newFeatureTitle}
            onChange={(e) => setNewFeatureTitle(e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 
                     dark:bg-gray-700 dark:text-gray-100
                     ${
                       canAddOrUpdate
                         ? "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400"
                         : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                     }`}
            placeholder="Feature title (e.g., High-Speed Processor, Advanced Cooling System)"
          />
          <textarea
            value={newFeatureDesc}
            onChange={(e) => setNewFeatureDesc(e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 
                     dark:bg-gray-700 dark:text-gray-100
                     ${
                       canAddOrUpdate
                         ? "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400"
                         : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                     }`}
            placeholder="Detailed feature description with benefits and specifications..."
            rows={2}
          />

          <div className="flex gap-3">
            <button
              onClick={addOrUpdateFeature}
              disabled={!canAddOrUpdate}
              className={`flex-1 px-4 py-3 rounded-lg transition-all duration-300 ${
                canAddOrUpdate
                  ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white shadow-md"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {editingIndex !== null ? "✓ Update Feature" : "+ Add Feature"}
            </button>

            {editingIndex !== null && (
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {localFeaturesError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              ⚠️ {localFeaturesError}
            </p>
          </div>
        )}
      </div>

      {/* Validation Rules Section */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-lg text-gray-800 dark:text-gray-100">
            <span className="mr-2">{getHeaderIcon()}</span>
            Feature Requirements:
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
                        rule.importance,
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
                      ❌ Need at least 1 feature
                    </div>
                  )}
                  {!result && rule.id === 2 && features.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ All features must have a title
                    </div>
                  )}
                  {!result && rule.id === 3 && features.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ All features must have a description
                    </div>
                  )}
                  {!result && rule.id === 4 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ❌ Select a category from the dropdown above
                    </div>
                  )}
                  {!result && rule.id === 5 && categoryKeywords.length > 0 && (
                    <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      ⚠️ Missing keywords:{" "}
                      {categoryKeywords
                        .filter(
                          (k) => !keywordCounts[k] || keywordCounts[k] === 0,
                        )
                        .join(", ")}
                    </div>
                  )}
                  {!result && rule.id === 6 && features.length >= 2 && (
                    <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      ⚠️ Try to vary feature titles
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
                  {features.length === 0
                    ? "Add Features"
                    : features.length < 1
                      ? `${features.length}/1 Features`
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
