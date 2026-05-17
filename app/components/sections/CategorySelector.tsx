"use client";

import { useEffect, useMemo } from "react";
import { AlignJustify, ChevronRight } from "lucide-react";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import {
  VALIDATION_COLORS,
  getBorderColorFromScore,
} from "../../utils/ui/validationColors";
import { Combobox, ComboboxOption } from "../Combobox";

interface CategoryNode {
  slug: string;
  name: string;
  children?: CategoryNode[];
  keywords?: string[];
}

interface CategorySelectorProps {
  selectedCategory: string;
  setSelectedCategory: (slug: string) => void;
  categories: CategoryNode[];
  keywords: string[];
}

export default function CategorySelector({
  selectedCategory,
  setSelectedCategory,
  categories,
  keywords,
}: CategorySelectorProps) {
  // Flatten categories with depth info
  const options = useMemo<ComboboxOption[]>(() => {
    const flatten = (cats: CategoryNode[], depth = 0): ComboboxOption[] => {
      let result: ComboboxOption[] = [];
      for (const cat of cats) {
        result.push({
          value: cat.slug,
          label: cat.name,
          depth,
          icon:
            depth === 0 ? (
              <AlignJustify className="w-4 h-4 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ),
        });
        if (cat.children?.length) {
          result.push(...flatten(cat.children, depth + 1));
        }
      }
      return result;
    };
    return flatten(categories);
  }, [categories]);

  // Check if selected value exists in options
  const selectedValueExists = options.some(
    (option) => option.value === selectedCategory,
  );

  useEffect(() => {
    if (selectedCategory && !selectedValueExists) {
      console.warn(
        `Warning: Selected category "${selectedCategory}" not found in options`,
      );
    }
  }, [selectedCategory, selectedValueExists]);

  const selectedLabel = options.find(
    (opt) => opt.value === selectedCategory,
  )?.label;

  // ===== Validation (unchanged) =====
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
        <label className="block text-black dark:text-gray-100 font-medium mb-2">
          Select Category:
        </label>

        <Combobox
          options={options}
          selectedValue={selectedCategory}
          onSelect={setSelectedCategory}
          placeholder="Select a category..."
          searchPlaceholder="Type to search..."
          noOptionsMessage="No categories found"
        />

        {/* Warning for invalid selection */}
        {selectedCategory && !selectedValueExists && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            ⚠️ The selected category "{selectedCategory}" is not available.
            Please select a valid category.
          </p>
        )}

        {/* Keywords display (unchanged) */}
        {selectedCategory && selectedValueExists && keywords.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📌 Keywords for this Category:
            </p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full border border-blue-200 dark:border-blue-700"
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
