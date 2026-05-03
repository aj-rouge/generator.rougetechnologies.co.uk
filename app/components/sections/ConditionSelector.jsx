"use client";

import { useCallback, useEffect, useState } from "react";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { VALIDATION_COLORS } from "../../utils/ui/validationColors";

// Helper to find a category by slug (recursive)
export const findCategoryBySlug = (categories, slug) => {
  if (!categories || !slug) return null;

  for (const cat of categories) {
    if (cat.slug === slug) return cat;
    if (cat.children && cat.children.length > 0) {
      const found = findCategoryBySlug(cat.children, slug);
      if (found) return found;
    }
  }
  return null;
};

export default function ConditionSelector({
  condition,
  setCondition,
  selectedCategory,
  categories,
}) {

  const [conditionOptions, setConditionOptions] = useState([]);
  const [conditionGroup, setConditionGroup] = useState(null);
  const [validationState, setValidationState] = useState({
    isValid: null,
    suggestedCondition: null,
  });
  const [error, setError] = useState(null);

  // Find the selected category object whenever selectedCategory or categories change
  useEffect(() => {
    if (!selectedCategory || !categories) {
      setConditionOptions([]);
      setConditionGroup(null);
      setValidationState({ isValid: null, suggestedCondition: null });
      setError(null);
      return;
    }

    const cat = findCategoryBySlug(categories, selectedCategory);

    if (cat) {
      if (cat.condition_group && cat.condition_group.options) {
        const options = cat.condition_group.options.map((opt) => ({
          value: opt,
          label: opt,
        }));

        setConditionOptions(options);
        setConditionGroup(cat.condition_group);
        console.log("Found condition group:", cat.condition_group);
        setError(null);

        // Validate current condition against new options
        if (condition) {
          const isValid = cat.condition_group.options.includes(condition);
          setValidationState({
            isValid,
            suggestedCondition:
              !isValid && options.length > 0 ? options[0].value : null,
          });
        } else {
          setValidationState({ isValid: null, suggestedCondition: null });
        }
      } else {
        setConditionOptions([]);
        setConditionGroup(null);
        setError("Category has no condition group mapping");
        setValidationState({ isValid: null, suggestedCondition: null });
      }
    } else {
      setConditionOptions([]);
      setConditionGroup(null);
      setError(`Category "${selectedCategory}" not found`);
      setValidationState({ isValid: null, suggestedCondition: null });
    }
  }, [selectedCategory, categories, condition]);

  // Auto-select first condition if none selected and options are available
  useEffect(() => {
    if (conditionOptions.length > 0 && !condition) {
      setCondition(conditionOptions[0].value);
    }
  }, [conditionOptions, condition, setCondition]);

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
        check: () => conditionOptions.length > 0 && !error,
        importance: "critical",
        condition: !!selectedCategory,
        errorMessage: (() => {
          if (!selectedCategory) return null;
          if (error) return `❌ Error: ${error}`;
          if (conditionOptions.length === 0)
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
        condition: conditionOptions.length > 0,
        errorMessage:
          conditionOptions.length > 0 && !condition
            ? "❌ Missing: Choose a condition from the dropdown above"
            : null,
      },
      {
        id: 4,
        name: "Valid Condition",
        description: "Condition must be valid for this category",
        check: () => validationState?.isValid === true,
        importance: "critical",
        condition: !!condition && conditionOptions.length > 0,
        errorMessage: (() => {
          if (!condition || conditionOptions.length === 0) return null;
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
    if (error) return "⚠️ Error";
    if (conditionOptions.length === 0) return "⚠️ Category Mapping Error";
    if (!condition) return "⚠️ Select Condition";
    if (validationState?.isValid === false) return "⚠️ Invalid Condition";
    if (allRulesPass && validationState?.isValid) return "✓ Condition Set";
    return "⚠️ Needs Attention";
  }, [
    selectedCategory,
    error,
    conditionOptions,
    condition,
    validationState,
    allRulesPass,
  ]);

  // --- Header icon ---
  const getHeaderIcon = useCallback(() => {
    if (!selectedCategory || error || conditionOptions.length === 0) {
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
        {conditionOptions.length > 0 && conditionGroup && (
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
          {selectedCategory && conditionOptions.length > 0 && (
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
              vary by product category. Please select a category to see
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
        {selectedCategory && !error && conditionOptions.length === 0 && (
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
        {conditionOptions.length > 0 && (
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
            : error
              ? "Error"
              : conditionOptions.length === 0
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
