"use client";

import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { VALIDATION_COLORS } from "../../utils/ui/validationColors";
import { LengthIndicatorBar } from "./LengthIndicatorBar";
import { getStatusBadgeColorFromState } from "../../utils/ui/statusHelpers";
import { AIGenerateButton } from "../AIGenerateButton";

const TITLE_CONFIG = {
  MIN_LENGTH: 50,
  MAX_LENGTH: 80,
  DISPLAY_KEYWORDS_LIMIT: 3,
};

export default function TitleInput({
  title,
  setTitle,
  categoryKeywords = [],
  categoryName = "",
  specifications = [],
  brand = "",
}) {
  // Format keywords for display
  const formatKeywords = (keywords) => {
    if (!keywords || keywords.length === 0) return "No category selected";
    if (keywords.length <= TITLE_CONFIG.DISPLAY_KEYWORDS_LIMIT) {
      return keywords.join(", ");
    }
    return `${keywords.slice(0, TITLE_CONFIG.DISPLAY_KEYWORDS_LIMIT).join(", ")}...`;
  };

  // Check if title includes any category keywords in first N chars
  const checkKeywordUsage = () => {
    if (categoryKeywords.length === 0) return null;

    const firstChars = title
      .substring(0, TITLE_CONFIG.MIN_LENGTH)
      .toLowerCase();
    const usedKeywords = categoryKeywords.filter((keyword) =>
      firstChars.includes(keyword.toLowerCase()),
    );

    return {
      used: usedKeywords,
      unused: categoryKeywords.filter((k) => !usedKeywords.includes(k)),
      hasAtLeastOne: usedKeywords.length >= 1,
    };
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const getKeywordStatus = () => {
    if (categoryKeywords.length === 0) return "❌ No category selected";
    if (!title || title.length === 0) return "No title entered";

    const keywordAnalysis = checkKeywordUsage();
    if (!keywordAnalysis) return "Analyzing...";

    return keywordAnalysis.hasAtLeastOne
      ? `✅ ${keywordAnalysis.used.length} category keyword(s) used`
      : "❌ No category keywords used";
  };

  const hasCategory = categoryKeywords.length > 0;

  // Validation rules
  const validationRules = [
    {
      id: 1,
      name: "Category Selected",
      description: "Select a product category first",
      check: () => hasCategory,
      importance: "critical",
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
        return keywordAnalysis?.hasAtLeastOne ?? false;
      },
      importance: "critical",
      condition: hasCategory && title.length > 0,
      errorMessage:
        hasCategory && title.length > 0 && !checkKeywordUsage()?.hasAtLeastOne
          ? `❌ Missing: Add at least one keyword from: ${categoryKeywords.join(", ")}`
          : null,
    },
  ];

  const displayRules = validationRules.filter(
    (rule) =>
      rule.condition !== false && !(rule.id === 3 && title.length === 0),
  );

  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(displayRules);

  const getHeaderIcon = () => {
    if (!hasCategory) return VALIDATION_COLORS.icon.critical;
    if (allRulesPass) return VALIDATION_COLORS.icon.success;
    if (passedRules > 0) return VALIDATION_COLORS.icon.warning;
    return VALIDATION_COLORS.icon.critical;
  };

  const getOverallStatus = () => {
    if (!hasCategory) return "⚠️ Select Category";
    if (!title) return "⚠️ Enter Title";
    if (allRulesPass) return "✓ Perfect Title";
    return "⚠️ Needs Attention";
  };

  const getInputBorderColor = () => {
    if (!hasCategory) {
      return "border-yellow-300 dark:border-yellow-500 focus:ring-yellow-500";
    }
    if (title.length > TITLE_CONFIG.MAX_LENGTH) {
      return "border-red-300 dark:border-red-500 focus:ring-red-500";
    }
    if (title.length < TITLE_CONFIG.MIN_LENGTH) {
      return "border-yellow-300 dark:border-yellow-500 focus:ring-yellow-500";
    }
    if (checkKeywordUsage()?.used.length === 0) {
      return "border-yellow-300 dark:border-yellow-500 focus:ring-yellow-500";
    }
    if (allRulesPass) {
      return "border-green-300 dark:border-green-500 focus:ring-green-500";
    }
    return "border-gray-300 dark:border-gray-600 focus:ring-blue-500";
  };

  const keywordAnalysis = checkKeywordUsage();

  // Helper to get badge color for keyword status
  const keywordStatusBadgeColor = () => {
    if (!hasCategory || !keywordAnalysis) return "";
    if (keywordAnalysis.hasAtLeastOne) {
      return getStatusBadgeColorFromState({ isComplete: true });
    }
    return getStatusBadgeColorFromState({ hasCriticalError: true });
  };

  // Helper for individual keyword chip
  const getKeywordChipColor = (isUsed) => {
    if (isUsed) {
      return getStatusBadgeColorFromState({ isComplete: true });
    }
    return getStatusBadgeColorFromState({}); // default gray
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
      <div className="flex flex-col flex-1 gap-2">
        <div className="flex justify-between items-center">
          <label className="block text-black dark:text-gray-100 font-medium">
            Enter your title:
          </label>
          <div className="flex items-center gap-2">
            {hasCategory && keywordAnalysis && (
              <span
                className={`text-sm font-medium px-2 py-1 rounded ${keywordStatusBadgeColor()}`}
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
        <AIGenerateButton
          task="title"
          payload={{
            originalTitle: title || "",
            categoryName,
            categoryKeywords,
            specifications,
            brand,
          }}
          onSuccess={(data) => data.title && setTitle(data.title)}
          successMessage="Title generated successfully!"
          disabled={!hasCategory || !title}
          className="whitespace-nowrap"
        >
          Generate Title
        </AIGenerateButton>
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 
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
        </div>

        {hasCategory && (
          <LengthIndicatorBar
            currentLength={title.length}
            minLength={TITLE_CONFIG.MIN_LENGTH}
            maxLength={TITLE_CONFIG.MAX_LENGTH}
            showMinLine
            showMaxLine
            barHeight="h-2"
          />
        )}

        {hasCategory && title.length > 0 && (
          <div>
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getKeywordStatus()}
              </p>
              {keywordAnalysis && keywordAnalysis.used.length === 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Add at least one keyword from: {categoryKeywords.join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1 text-xs">
              {categoryKeywords.map((keyword, index) => {
                const isUsed = keywordAnalysis?.used.includes(keyword);
                return (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded ${getKeywordChipColor(isUsed)}`}
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
        headerIcon={getHeaderIcon()}
        headerText="Title Requirements"
        validationScore={validationScore}
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
