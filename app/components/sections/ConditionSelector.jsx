"use client";

import { useCallback } from "react";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { VALIDATION_COLORS } from "../../utils/ui/validationColors";

export default function ConditionSelector({
  condition,
  setCondition,
  selectedCategory,
  conditionOptions,
  conditionGroup,
  validationState,
  isLoading,
  error,
}) {
  // --- Helper: eBay group name display ---
  const conditionGroupValue =
    conditionGroup?.group_name || conditionGroup?.group_key || "Not mapped";

  // --- Build validation rules based on props ---
  const checkValidationRules = useCallback(() => {
    const rules = [
      {
        id: 1,
        name: "Category Selected",
        description: "Select a product category first",
        check: () => !!selectedCategory,
        importance: "critical",
        isCategoryRule: true,
        errorMessage: !selectedCategory
          ? "❌ Missing: Select a category from the dropdown above"
          : null,
      },
      {
        id: 2,
        name: "Condition Mapping",
        description: (
          <span>
            eBay condition group: {conditionGroupValue}{" "}
            <a
              href="https://www.ebay.co.uk/help/selling/listings/creating-managing-listings/item-conditions-category?id=4765"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline text-xs"
            >
              Learn More
            </a>
          </span>
        ),
        check: () => !!conditionOptions && !error,
        importance: "critical",
        condition: !!selectedCategory,
        errorMessage: (() => {
          if (!selectedCategory) return null;
          if (isLoading) return "⏳ Loading condition options...";
          if (error) return `❌ Error: ${error}`;
          if (!conditionOptions)
            return `❌ Error: Category "${selectedCategory}" is not properly mapped to eBay conditions`;
          return null;
        })(),
      },
      {
        id: 3,
        name: "Condition Selected",
        description: "Choose an item condition",
        check: () => !!condition,
        importance: "critical",
        condition: !!conditionOptions,
        errorMessage:
          conditionOptions && !condition
            ? "❌ Missing: Choose a condition from the dropdown above"
            : null,
      },
      {
        id: 4,
        name: "Valid Condition",
        description: "Condition must be valid for this category",
        check: () => validationState?.isValid === true,
        importance: "critical",
        condition: !!condition && !!conditionOptions,
        errorMessage: (() => {
          if (!condition || !conditionOptions) return null;
          if (validationState?.isValid === false) {
            return `❌ Invalid condition for this category. Suggested: ${validationState.suggestedCondition || "None"}`;
          }
          return null;
        })(),
      },
    ];

    return rules;
  }, [
    selectedCategory,
    conditionOptions,
    error,
    isLoading,
    condition,
    validationState,
    conditionGroupValue,
  ]);

  const validationRules = checkValidationRules();
  const displayRules = validationRules.filter(
    (rule) => rule.condition !== false,
  );

  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(displayRules);

  // --- Overall status string ---
  const getOverallStatus = useCallback(() => {
    if (!selectedCategory) return "⚠️ Select Category";
    if (isLoading) return "⏳ Loading...";
    if (error) return "⚠️ Error";
    if (!conditionOptions) return "⚠️ Category Mapping Error";
    if (!condition) return "⚠️ Select Condition";
    if (validationState?.isValid === false) return "⚠️ Invalid Condition";
    if (allRulesPass && validationState?.isValid) return "✓ Condition Set";
    return "⚠️ Needs Attention";
  }, [
    selectedCategory,
    isLoading,
    error,
    conditionOptions,
    condition,
    validationState,
    allRulesPass,
  ]);

  // --- Header icon ---
  const getHeaderIcon = useCallback(() => {
    if (!selectedCategory || isLoading || error || !conditionOptions) {
      return VALIDATION_COLORS.icon.critical;
    }
    if (!condition || validationState?.isValid === false) {
      return VALIDATION_COLORS.icon.warning;
    }
    if (allRulesPass && validationState?.isValid) {
      return VALIDATION_COLORS.icon.success;
    }
    return VALIDATION_COLORS.icon.warning;
  }, [
    selectedCategory,
    isLoading,
    error,
    conditionOptions,
    condition,
    validationState,
    allRulesPass,
  ]);

  // --- Subtitle for StatusHeader ---
  const getSubtitle = useCallback(() => {
    if (!selectedCategory) return null;

    return (
      <>
        Category: <span className="font-medium">{selectedCategory}</span>
        {conditionOptions && conditionGroup && (
          <span className="ml-3">
            eBay group:{" "}
            <span className="font-medium">{conditionGroupValue}</span>{" "}
            <a
              href="https://www.ebay.co.uk/help/selling/listings/creating-managing-listings/item-conditions-category?id=4765"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline ml-1 text-xs"
            >
              Learn More
            </a>
          </span>
        )}
      </>
    );
  }, [selectedCategory, conditionOptions, conditionGroup, conditionGroupValue]);

  return (
    <ValidationWrapper validationScore={validationScore}>
      <StatusHeader
        title="Item Condition"
        status={getOverallStatus()}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle={getSubtitle()}
      />

      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            Select condition:
          </label>
          {selectedCategory && conditionOptions && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {conditionOptions.length} eBay options
            </span>
          )}
        </div>

        {/* Category Warning */}
        {!selectedCategory && (
          <div
            className={`p-3 ${VALIDATION_COLORS.bg.warning} rounded-lg border ${VALIDATION_COLORS.border.warning}`}
          >
            <p className={`text-sm ${VALIDATION_COLORS.text.warning}`}>
              ⚠️ <strong>Select a category first:</strong> Condition options
              vary by product category. Please select a category above to see
              eBay-specific condition options.{" "}
              <a
                href="https://www.ebay.co.uk/help/selling/listings/creating-managing-listings/item-conditions-category?id=4765"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Learn More
              </a>
            </p>
          </div>
        )}

        {/* Loading State */}
        {selectedCategory && isLoading && (
          <div
            className={`mb-4 p-3 ${VALIDATION_COLORS.bg.warning} rounded-lg border ${VALIDATION_COLORS.border.warning}`}
          >
            <p className={`text-sm ${VALIDATION_COLORS.text.warning}`}>
              <span className="animate-pulse">⏳</span>{" "}
              <strong>Loading condition options...</strong>
            </p>
          </div>
        )}

        {/* Error State */}
        {selectedCategory && error && (
          <div
            className={`mb-4 p-3 ${VALIDATION_COLORS.bg.critical} rounded-lg border ${VALIDATION_COLORS.border.critical}`}
          >
            <p className={`text-sm ${VALIDATION_COLORS.text.critical}`}>
              ❌ <strong>Error:</strong> {error}. Please try again or contact
              support.
            </p>
          </div>
        )}

        {/* Category Mapped but no options */}
        {selectedCategory && !isLoading && !error && !conditionOptions && (
          <div
            className={`mb-4 p-3 ${VALIDATION_COLORS.bg.critical} rounded-lg border ${VALIDATION_COLORS.border.critical}`}
          >
            <p className={`text-sm ${VALIDATION_COLORS.text.critical}`}>
              ❌ <strong>Category Mapping Error:</strong> The selected category{" "}
              &quot;{selectedCategory}&quot; doesn&apos;t have an eBay condition
              group mapping. Please update the category mapping in your data.{" "}
              <a
                href="https://www.ebay.co.uk/help/selling/listings/creating-managing-listings/item-conditions-category?id=4765"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Learn More
              </a>
            </p>
          </div>
        )}

        {/* Condition Selector */}
        {conditionOptions && (
          <>
            <select
              value={condition || ""}
              onChange={(e) => setCondition(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 
                dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600
                border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-400
                ${
                  validationState?.isValid === false
                    ? "border-red-500 dark:border-red-500"
                    : ""
                }`}
            >
              <option value="">Select a condition...</option>
              {conditionOptions.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Validation Warning */}
            {validationState?.isValid === false && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                ⚠️ This condition may not be valid for this category.
                {validationState.suggestedCondition && (
                  <button
                    onClick={() =>
                      setCondition(validationState.suggestedCondition)
                    }
                    className="ml-2 text-blue-600 dark:text-blue-400 underline hover:no-underline"
                  >
                    Use suggested: {validationState.suggestedCondition}
                  </button>
                )}
              </div>
            )}

            {/* Condition Description */}
            {condition && conditionGroup && validationState?.isValid && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">eBay Definition:</span> From
                eBay&apos;s official condition guidelines for{" "}
                {conditionGroupValue} items.{" "}
                <a
                  href="https://www.ebay.co.uk/help/selling/listings/creating-managing-listings/item-conditions-category?id=4765"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  Learn More
                </a>
              </div>
            )}
          </>
        )}
      </div>

      <ValidationRules
        rules={displayRules}
        headerIcon={getHeaderIcon()}
        headerText="Condition Requirements"
        validationScore={validationScore}
        allRulesPass={allRulesPass && validationState?.isValid !== false}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={
          !selectedCategory
            ? "Select Category"
            : isLoading
              ? "Loading..."
              : error
                ? "Error"
                : !conditionOptions
                  ? "Mapping Error"
                  : !condition
                    ? "Select Condition"
                    : validationState?.isValid === false
                      ? "Invalid Condition"
                      : allRulesPass && validationState?.isValid
                        ? "Perfect!"
                        : "Needs work"
        }
      />
    </ValidationWrapper>
  );
}
