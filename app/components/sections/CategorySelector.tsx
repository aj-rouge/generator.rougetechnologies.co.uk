"use client";

import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import {
  VALIDATION_COLORS,
  getBorderColorFromScore,
} from "../../utils/ui/validationColors";
import { useEffect, useState } from "react";

interface CategoryOption {
  value: string;
  label: string;
  className?: string; // optional styling (e.g., for parent categories)
}

interface CategorySelectorProps {
  selectedCategory: string;
  setSelectedCategory: (slug: string) => void;
  options: CategoryOption[]; // flattened list of category options
  keywords: string[]; // keywords for the selected category
}

export default function CategorySelector({
  selectedCategory,
  setSelectedCategory,
  options,
  keywords,
}: CategorySelectorProps) {
  // Add state to track if the selected value exists in options
  const [selectedValueExists, setSelectedValueExists] = useState(true);

  // Check if the selected value exists in options
  useEffect(() => {
    const exists = options.some((option) => option.value === selectedCategory);
    setSelectedValueExists(exists);

    if (selectedCategory && !exists) {
      console.warn(
        `Warning: Selected category "${selectedCategory}" not found in options`,
      );
    }
  }, [selectedCategory, options]);

  // ===== Validation =====
  const validationRules = [
    {
      id: 1,
      name: "Category Selected",
      description: "Select a product category",
      check: () => !!selectedCategory && selectedValueExists,
      importance: "critical" as const,
      errorMessage: !selectedCategory
        ? "❌ Missing: Please select a category from the dropdown"
        : !selectedValueExists
          ? "❌ Error: Selected category not found in options"
          : null,
    },
  ];

  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(validationRules);

  // ===== UI state helpers =====
  const getOverallStatus = () => {
    if (!selectedCategory) return "⚠️ Select Category";
    if (!selectedValueExists) return "⚠️ Invalid Category";
    if (allRulesPass) return "✓ Category Set";
    return "⚠️ Needs Attention";
  };

  const overallStatus = getOverallStatus();
  const headerIcon =
    !selectedCategory || !selectedValueExists
      ? VALIDATION_COLORS.icon.critical
      : allRulesPass
        ? VALIDATION_COLORS.icon.success
        : VALIDATION_COLORS.icon.warning;

  const subtitle =
    selectedCategory && selectedValueExists
      ? `Keywords: ${keywords.length} available`
      : null;
  return (
    <ValidationWrapper
      validationScore={validationScore}
      borderColor={getBorderColorFromScore(validationScore)}
    >
      <StatusHeader
        title="Product Category"
        status={overallStatus}
        hasCriticalError={!selectedCategory || !selectedValueExists}
        isComplete={allRulesPass}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle={subtitle}
      />

      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            Select Category:
          </label>
          {selectedCategory && selectedValueExists && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {keywords.length} keywords
            </span>
          )}
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={`w-full px-4 py-2 border ${
            !selectedValueExists && selectedCategory
              ? "border-red-500 dark:border-red-400"
              : "border-gray-300 dark:border-gray-600"
          } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
             dark:bg-gray-700 dark:text-gray-100`}
        >
          <option value="">Select a category...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Show warning if selected category doesn't exist */}
        {selectedCategory && !selectedValueExists && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            ⚠️ The selected category "{selectedCategory}" is not available in
            the options. Please select a valid category.
          </p>
        )}

        {/* Display selected keywords */}
        {selectedCategory && selectedValueExists && keywords.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📌 Keywords for this Category:
            </p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 
                         text-sm rounded-full border border-blue-200 dark:border-blue-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Include these keywords where required for better SEO
            </p>
          </div>
        )}
      </div>

      <ValidationRules
        rules={validationRules}
        headerIcon={headerIcon}
        headerText="Category Requirements"
        validationScore={validationScore}
        allRulesPass={allRulesPass}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={
          !selectedCategory
            ? "Select Category"
            : !selectedValueExists
              ? "Invalid Category"
              : allRulesPass
                ? "Perfect!"
                : "Needs work"
        }
      />
    </ValidationWrapper>
  );
}
