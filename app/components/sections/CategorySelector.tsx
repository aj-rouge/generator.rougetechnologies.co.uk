"use client";

import { useState, useEffect, useMemo } from "react";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { VALIDATION_COLORS } from "../../utils/ui/validationColors";

interface Category {
  slug: string;
  name: string;
  parent_category: string | null;
  keywords: string[];
  condition_group?: {
    group_key: string;
    group_name: string;
    options: string[];
  };
  children?: Category[];
}

interface CategorySelectorProps {
  /** The currently selected category name (controlled) */
  selectedCategory: string;
  /** Callback when selection changes */
  setSelectedCategory: (category: string) => void;
}

export default function CategorySelector({
  selectedCategory,
  setSelectedCategory,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to parse keywords (might be JSON string, array, or null)
  const parseKeywords = (keywords: any): string[] => {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === "string") {
      try {
        return JSON.parse(keywords);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/categories");
        const data = await response.json();

        if (data.success) {
          // Normalize: parse children JSON if needed, and parse keywords for every category
          const normalized = data.categories.map((parent: any) => {
            let children = parent.children;
            // If children is a JSON string, parse it
            if (typeof children === "string") {
              try {
                children = JSON.parse(children);
              } catch {
                children = [];
              }
            }
            // Ensure it's an array
            if (!Array.isArray(children)) {
              children = [];
            }

            // Parse parent keywords
            const parentKeywords = parseKeywords(parent.keywords);

            // Parse child keywords
            const parsedChildren = children.map((child: any) => ({
              ...child,
              keywords: parseKeywords(child.keywords),
            }));

            return {
              ...parent,
              keywords: parentKeywords,
              children: parsedChildren,
            };
          });
          console.log("Selected Category:", selectedCategory);
          console.log("Fetched and normalized categories:", normalized);
          setCategories(normalized);
        } else {
          setError("Failed to load categories");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError("Error loading categories");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // selectedCategory is not a dependency because we only log it

  // Handle category selection
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  // Helper to find a category by name in the tree (including children)
  const findCategoryByName = (name: string): Category | null => {
    if (!name || categories.length === 0) return null;

    for (const parent of categories) {
      if (parent.name === name) return parent;
      if (Array.isArray(parent.children)) {
        const child = parent.children.find((c) => c.name === name);
        if (child) return child;
      }
    }
    return null;
  };

  const selectedCat = useMemo(
    () => findCategoryByName(selectedCategory),
    [selectedCategory, categories],
  );

  const allKeywords = selectedCat?.keywords || [];

  // Validation rules
  const validationRules = [
    {
      id: 1,
      name: "Category Selected",
      description: "Select a product category",
      check: () => !!selectedCategory,
      importance: "critical" as const,
      errorMessage: !selectedCategory
        ? "❌ Missing: Please select a category from the dropdown"
        : null,
    },
    {
      id: 2,
      name: "Category Has Keywords",
      description: "Category should have associated keywords",
      check: () => {
        if (!selectedCategory) return false;
        return allKeywords.length > 0;
      },
      importance: "critical" as const,
      condition: !!selectedCategory,
      errorMessage:
        selectedCategory && allKeywords.length === 0
          ? `❌ Warning: Selected category doesn't have any keywords mapped`
          : null,
    },
  ];

  const displayRules = validationRules.filter(
    (rule) => rule.condition !== false,
  );
  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(displayRules);

  const getOverallStatus = () => {
    if (loading) return "⏳ Loading...";
    if (error) return "⚠️ Error";
    if (!selectedCategory) return "⚠️ Select Category";
    if (allRulesPass) return "✓ Category Set";
    return "⚠️ Needs Attention";
  };

  const getHeaderIcon = () => {
    if (loading || error) return VALIDATION_COLORS.icon.warning;
    if (!selectedCategory) return VALIDATION_COLORS.icon.critical;
    if (allRulesPass) return VALIDATION_COLORS.icon.success;
    return VALIDATION_COLORS.icon.warning;
  };

  const getSubtitle = () => {
    if (loading) return "Fetching categories...";
    if (error) return "Failed to load categories";
    if (!selectedCategory) return null;
    return `Keywords: ${allKeywords.length} available`;
  };

  // Loading state
  if (loading) {
    return (
      <ValidationWrapper validationScore={0}>
        <StatusHeader
          title="Product Category"
          status="⏳ Loading..."
          rulesPassed={0}
          totalRules={2}
          subtitle="Fetching categories..."
        />
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </ValidationWrapper>
    );
  }

  // Error state
  if (error) {
    return (
      <ValidationWrapper validationScore={0}>
        <StatusHeader
          title="Product Category"
          status="⚠️ Error"
          rulesPassed={0}
          totalRules={2}
          subtitle="Failed to load categories"
        />
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </ValidationWrapper>
    );
  }

  return (
    <ValidationWrapper validationScore={validationScore}>
      <StatusHeader
        title="Product Category"
        status={getOverallStatus()}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle={getSubtitle()}
      />

      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            Product Category:
          </label>
          {selectedCategory && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {allKeywords.length} keywords
            </span>
          )}
        </div>

        <select
          value={selectedCategory}
          onChange={handleCategoryChange}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
             rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
             dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">Select a category...</option>

          {categories.map((parent, parentIndex) => [
            // Parent category as a disabled header option
            <option
              key={parent.slug}
              value={parent.name}
              className="font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {parent.name}
            </option>,
            // Children categories
            ...(Array.isArray(parent.children)
              ? parent.children.map((child, childIndex) => (
                  <option key={child.slug} value={child.name} className="pl-4">
                    {childIndex === parent.children.length - 1 ? "└ " : "├ "}{" "}
                    {child.name}
                  </option>
                ))
              : []),
          ])}
        </select>

        {/* Warning for categories without keywords */}
        {selectedCategory && allKeywords.length === 0 && (
          <div
            className={`mt-4 p-3 ${VALIDATION_COLORS.bg.warning} rounded-lg border ${VALIDATION_COLORS.border.warning}`}
          >
            <p className={`text-sm ${VALIDATION_COLORS.text.warning}`}>
              ⚠️ <strong>No Keywords Mapped:</strong> The selected category
              doesn&apos;t have any SEO keywords assigned. Consider adding
              keywords to improve listing optimization.
            </p>
          </div>
        )}

        {/* Display selected keywords */}
        {selectedCategory && allKeywords.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📌 Keywords for this Category:
            </p>
            <div className="flex flex-wrap gap-2">
              {allKeywords.map((keyword, index) => (
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
        rules={displayRules}
        headerIcon={getHeaderIcon()}
        headerText="Category Requirements"
        validationScore={validationScore}
        allRulesPass={allRulesPass}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={
          loading
            ? "Loading..."
            : error
              ? "Error"
              : !selectedCategory
                ? "Select Category"
                : allRulesPass
                  ? "Perfect!"
                  : "Needs work"
        }
      />
    </ValidationWrapper>
  );
}
