"use client";

import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import {
  getImportanceColor,
  getValidationColor,
  calculateValidationScore,
} from "../../utils/ui/validationHelpers";
import { VALIDATION_COLORS } from "../../utils/ui/validationColors";
import { LengthIndicatorBar } from "./LengthIndicatorBar";

const TITLE_CONFIG = {
  MIN_LENGTH: 50,
  MAX_LENGTH: 80,
  DISPLAY_KEYWORDS_LIMIT: 3,
};

export default function TitleInput({ title, setTitle, categoryKeywords = [] }) {
  // Function to format keywords for display
  const formatKeywords = (keywords) => {
    if (!keywords || keywords.length === 0) return "No category selected";

    if (keywords.length <= TITLE_CONFIG.DISPLAY_KEYWORDS_LIMIT) {
      return keywords.join(", ");
    }

    return `${keywords
      .slice(0, TITLE_CONFIG.DISPLAY_KEYWORDS_LIMIT)
      .join(", ")}...`;
  };

  // Function to check if title includes any category keywords in first N chars
  const checkKeywordUsage = () => {
    if (categoryKeywords.length === 0) return null;

    const firstChars = title
      .substring(0, TITLE_CONFIG.MIN_LENGTH)
      .toLowerCase();
    const usedKeywords = categoryKeywords.filter((keyword) =>
      firstChars.includes(keyword.toLowerCase()),
    );

    const unusedKeywords = categoryKeywords.filter(
      (keyword) => !firstChars.includes(keyword.toLowerCase()),
    );

    return {
      used: usedKeywords,
      unused: unusedKeywords,
      hasAtLeastOne: usedKeywords.length >= 1,
    };
  };

  // Add handleTitleChange function
  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTitle(value);
  };

  // Get keyword usage status
  const getKeywordStatus = () => {
    if (categoryKeywords.length === 0) return "❌ No category selected";
    if (!title || title.length === 0) return "No title entered";

    const keywordAnalysis = checkKeywordUsage();
    if (!keywordAnalysis) return "Analyzing...";

    if (keywordAnalysis.used.length === 0) {
      return "❌ No category keywords used";
    } else {
      return `✅ ${keywordAnalysis.used.length} category keyword(s) used`;
    }
  };

  // Check if we have a category selected
  const hasCategory = categoryKeywords.length > 0;

  // Validation rules checker
  const checkValidationRules = () => {
    const rules = [
      {
        id: 1,
        name: "Category Selected",
        description: "Select a product category first",
        check: () => hasCategory,
        importance: "critical",
        isCategoryRule: true,
        errorMessage: !hasCategory
          ? "❌ Missing: Select a category from the dropdown above"
          : null,
      },
      {
        id: 2,
        name: "Minimum Length",
        description: `At least ${TITLE_CONFIG.MIN_LENGTH} characters`,
        check: () => title.length >= TITLE_CONFIG.MIN_LENGTH,
        importance: "critical",
        condition: hasCategory,
        errorMessage:
          hasCategory && title.length < TITLE_CONFIG.MIN_LENGTH
            ? `❌ Too short: Need at least ${TITLE_CONFIG.MIN_LENGTH} characters (currently ${title.length})`
            : null,
      },
      {
        id: 3,
        name: "Category Keywords",
        description: `Use at least one keyword in first ${
          TITLE_CONFIG.MIN_LENGTH
        } characters: ${formatKeywords(categoryKeywords)}`,
        check: () => {
          if (categoryKeywords.length === 0 || title.length === 0) return false;
          const keywordAnalysis = checkKeywordUsage();
          return keywordAnalysis && keywordAnalysis.hasAtLeastOne;
        },
        importance: "critical",
        condition: hasCategory && title.length > 0,
        errorMessage:
          hasCategory && title.length > 0 && !checkKeywordUsage()?.hasAtLeastOne
            ? `❌ Missing: Add at least one keyword from: ${categoryKeywords.join(", ")}`
            : null,
      },
    ];

    return rules;
  };

  const keywordAnalysis = checkKeywordUsage();
  const hasAnalysis = keywordAnalysis && categoryKeywords.length > 0;
  const validationRules = checkValidationRules();

  // Filter out rules that shouldn't be displayed
  const displayRules = validationRules.filter(
    (rule) =>
      rule.condition !== false && !(rule.id === 3 && title.length === 0),
  );

  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(displayRules);

  // Get header icon based on validation status
  const getHeaderIcon = () => {
    if (!hasCategory) return VALIDATION_COLORS.icon.critical;
    if (allRulesPass) return VALIDATION_COLORS.icon.success;
    if (passedRules > 0) return VALIDATION_COLORS.icon.warning;
    return VALIDATION_COLORS.icon.critical;
  };

  // Get overall status
  const getOverallStatus = () => {
    if (!hasCategory) {
      return "⚠️ Select Category";
    }
    if (!title) {
      return "⚠️ Enter Title";
    }
    if (allRulesPass) {
      return "✓ Perfect Title";
    }
    return "⚠️ Needs Attention";
  };

  // Get input border color based on specific validation
  const getInputBorderColor = () => {
    if (!hasCategory) {
      return "border-yellow-300 dark:border-yellow-500 focus:ring-yellow-500 dark:focus:ring-yellow-400";
    }
    if (title.length > TITLE_CONFIG.MAX_LENGTH) {
      return "border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400";
    }
    if (title.length < TITLE_CONFIG.MIN_LENGTH) {
      return "border-yellow-300 dark:border-yellow-500 focus:ring-yellow-500 dark:focus:ring-yellow-400";
    }
    if (keywordAnalysis && keywordAnalysis.used.length === 0) {
      return "border-yellow-300 dark:border-yellow-500 focus:ring-yellow-500 dark:focus:ring-yellow-400";
    }
    if (allRulesPass) {
      return "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400";
    }
    return "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400";
  };

  return (
    <ValidationWrapper validationScore={validationScore}>
      <StatusHeader
        title="Product Title"
        status={getOverallStatus()}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle={
          hasCategory
            ? `Category keywords: ${formatKeywords(categoryKeywords)}`
            : null
        }
      />
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            Enter your title:
          </label>
          <div className="flex items-center gap-2">
            {hasAnalysis && (
              <span
                className={`text-sm font-medium px-2 py-1 rounded ${
                  keywordAnalysis.used.length >= 1
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                Keywords: {keywordAnalysis.used.length}/
                {Math.min(1, categoryKeywords.length)} required
              </span>
            )}
            <span
              className={`text-sm ${
                title.length > TITLE_CONFIG.MAX_LENGTH
                  ? "text-red-600 dark:text-red-400"
                  : title.length < TITLE_CONFIG.MIN_LENGTH && hasCategory
                    ? "text-yellow-600 dark:text-yellow-400"
                    : hasCategory
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {title.length}/{TITLE_CONFIG.MAX_LENGTH} chars
              {hasCategory &&
                title.length < TITLE_CONFIG.MIN_LENGTH &&
                ` (need ${TITLE_CONFIG.MIN_LENGTH - title.length} more)`}
              {title.length > TITLE_CONFIG.MAX_LENGTH &&
                ` (${title.length - TITLE_CONFIG.MAX_LENGTH} over)`}
            </span>
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 
                     dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600
                     ${getInputBorderColor()}`}
          maxLength={TITLE_CONFIG.MAX_LENGTH}
          placeholder={
            hasCategory
              ? `E.g., "Your Product ${categoryKeywords[0]}" or "Premium ${categoryKeywords[1]}"... (${TITLE_CONFIG.MIN_LENGTH}-${TITLE_CONFIG.MAX_LENGTH} chars)`
              : "Select a category first to see title suggestions"
          }
          disabled={!hasCategory}
        />

        {/* Length indicator bar - Only show if category is selected */}
        {hasCategory && (
          <LengthIndicatorBar
            currentLength={title.length}
            minLength={TITLE_CONFIG.MIN_LENGTH}
            maxLength={TITLE_CONFIG.MAX_LENGTH}
            showMinLine={true}
            showMaxLine={true}
            barHeight="h-2"
            className="mt-4"
          />
        )}

        {/* Keyword usage visualization - Only show if category is selected */}
        {hasCategory && title.length > 0 && (
          <div className="mt-4">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getKeywordStatus()}
              </p>
              {keywordAnalysis &&
                keywordAnalysis.used.length === 0 &&
                categoryKeywords.length > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Add at least one keyword from: {categoryKeywords.join(", ")}
                  </p>
                )}
            </div>

            <div className="flex flex-wrap gap-1 text-xs">
              {categoryKeywords.map((keyword, index) => {
                const isUsed =
                  keywordAnalysis && keywordAnalysis.used.includes(keyword);
                return (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded ${
                      isUsed
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400"
                    }`}
                    title={isUsed ? "Keyword used" : "Keyword not used"}
                  >
                    {keyword} {isUsed ? "✓" : "✗"}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ValidationRules
        rules={displayRules}
        getImportanceColor={getImportanceColor}
        headerIcon={getHeaderIcon()}
        headerText="Title Requirements"
        validationScore={validationScore}
        getValidationColor={getValidationColor}
        allRulesPass={allRulesPass}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={
          !hasCategory
            ? "Select Category"
            : !title
              ? "Enter Title"
              : allRulesPass
                ? "Perfect!"
                : "Needs work"
        }
      />
    </ValidationWrapper>
  );
}
