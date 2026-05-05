"use client";

import { useState, useEffect } from "react";
import { Check, AlertTriangle, Download, Trash2, Plus, X } from "lucide-react";
import { CATEGORY_SECTIONS } from "../../data/categories";
import { getStatusBadgeColorFromState } from "../../utils/ui/statusHelpers";
import { ValidationWrapper } from "./ValidationWrapper";
import { ValidationRules } from "./ValidationRules";

// Helper function to convert sections to plain text for keyword counting
export function sectionsToText(sections) {
  if (!sections || !Array.isArray(sections)) return "";

  return sections
    .map((section) => {
      let text = "";
      if (section.subheading) {
        text += section.subheading + " ";
      }
      if (section.paragraphs && Array.isArray(section.paragraphs)) {
        text += section.paragraphs.join(" ");
      }
      return text;
    })
    .join(" ");
}

export default function SeoSectionManager({
  selectedCategory,
  categoryKeywords = [],
  seoSectionData,
  setSeoSectionData,
}) {
  const [newCategoryParagraph, setNewCategoryParagraph] = useState("");
  const [localCategoryError, setLocalCategoryError] = useState("");
  const [keywordCounts, setKeywordCounts] = useState({});
  const [showKeywordStats, setShowKeywordStats] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Structured data format
  const categoryName = seoSectionData?.name || "";
  const sections = seoSectionData?.sections || [];

  const setCategoryName = (name) => {
    setSeoSectionData((prev) => ({ ...prev, name }));
  };

  const setSections = (newSections) => {
    setSeoSectionData((prev) => ({ ...prev, sections: newSections }));
  };

  // Convert sections to plain text for calculations
  const categoryText = sectionsToText(sections);

  // Get total paragraphs count
  const totalParagraphs = sections.reduce(
    (total, section) => total + (section.paragraphs?.length || 0),
    0,
  );

  // Get all paragraphs as flat array
  const allParagraphs = sections.flatMap((section) => section.paragraphs || []);

  // Calculate content stats
  const totalChars = categoryText.length;
  const avgParaLength =
    totalParagraphs > 0 ? Math.round(totalChars / totalParagraphs) : 0;
  const shortParagraphs = allParagraphs.filter(
    (para) => para.length < 200,
  ).length;
  const hasShortParagraphs = shortParagraphs > 0;

  // Calculate keyword occurrences
  useEffect(() => {
    if (selectedCategory && categoryText) {
      const allText = categoryText.toLowerCase();
      const counts = {};

      categoryKeywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase();
        const regex = new RegExp(
          `\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "gi",
        );
        const matches = allText.match(regex);
        counts[keyword] = matches ? matches.length : 0;
      });

      const rougeRegex = /\brouge technologies\b/gi;
      const rougeMatches = allText.match(rougeRegex);
      counts["Rouge Technologies"] = rougeMatches ? rougeMatches.length : 0;

      setKeywordCounts(counts);
    } else {
      setKeywordCounts({});
    }
  }, [categoryText, selectedCategory, categoryKeywords]);

  // Add new paragraph to active section
  const addCategoryParagraph = () => {
    if (newCategoryParagraph.trim()) {
      const trimmedParagraph = newCategoryParagraph.trim();
      const newSections = [...sections];

      // Ensure we have at least one section
      if (newSections.length === 0) {
        newSections.push({ paragraphs: [] });
        setActiveSectionIndex(0);
      }

      // Add paragraph to active section
      if (!newSections[activeSectionIndex]) {
        newSections[activeSectionIndex] = { paragraphs: [] };
      }

      if (!newSections[activeSectionIndex].paragraphs) {
        newSections[activeSectionIndex].paragraphs = [];
      }

      newSections[activeSectionIndex].paragraphs.push(trimmedParagraph);
      setSections(newSections);
      setNewCategoryParagraph("");

      // Update error state
      if (totalParagraphs + 1 < 3) {
        setLocalCategoryError(
          `Add at least ${
            3 - (totalParagraphs + 1)
          } more paragraphs for comprehensive coverage`,
        );
      } else {
        setLocalCategoryError("");
      }
    }
  };

  // Remove a paragraph
  const removeCategoryParagraph = (sectionIndex, paraIndex) => {
    const newSections = [...sections];
    if (newSections[sectionIndex]?.paragraphs) {
      newSections[sectionIndex].paragraphs = newSections[
        sectionIndex
      ].paragraphs.filter((_, index) => index !== paraIndex);

      // Remove section if empty and no subheading
      if (
        newSections[sectionIndex].paragraphs.length === 0 &&
        !newSections[sectionIndex].subheading
      ) {
        newSections.splice(sectionIndex, 1);
        setActiveSectionIndex(Math.max(0, sectionIndex - 1));
      }

      setSections(newSections);
    }
  };

  // Add a new section
  const addNewSection = () => {
    const newSections = [...sections, { subheading: "", paragraphs: [] }];
    setSections(newSections);
    setActiveSectionIndex(newSections.length - 1);
  };

  // Update section subheading
  const updateSectionSubheading = (sectionIndex, subheading) => {
    const newSections = [...sections];
    if (newSections[sectionIndex]) {
      newSections[sectionIndex] = { ...newSections[sectionIndex], subheading };
      setSections(newSections);
    }
  };

  // Remove a section
  const removeSection = (sectionIndex) => {
    const newSections = sections.filter((_, index) => index !== sectionIndex);
    setSections(newSections);
    if (activeSectionIndex >= newSections.length) {
      setActiveSectionIndex(Math.max(0, newSections.length - 1));
    }
  };

  // Load ALL default content
  const loadAllDefaultContent = () => {
    if (selectedCategory && CATEGORY_SECTIONS[selectedCategory]) {
      const defaultSections =
        CATEGORY_SECTIONS[selectedCategory].sections || [];
      setSections(defaultSections);
    }
  };

  // Remove ALL content (clear everything)
  const removeAllDefaults = () => {
    setSections([]);
    setActiveSectionIndex(0);
    setNewCategoryParagraph("");
    setLocalCategoryError("");
  };

  // Update category name based on selected category
  useEffect(() => {
    if (selectedCategory) {
      const generatedName = `${selectedCategory} from Rouge Technologies`;
      setCategoryName(generatedName);

      // Don't auto-load default content - let user decide
    } else {
      setCategoryName("");
      setSections([]);
    }
  }, [selectedCategory]);

  // Validation calculations
  const hasMissingKeywords =
    selectedCategory &&
    categoryKeywords.length > 0 &&
    categoryKeywords.some(
      (keyword) => !keywordCounts[keyword] || keywordCounts[keyword] === 0,
    );

  const hasMissingBrand =
    !keywordCounts["Rouge Technologies"] ||
    keywordCounts["Rouge Technologies"] === 0;

  const totalKeywordCount = Object.values(keywordCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Validation rules checker
  const checkValidationRules = () => {
    const rules = [
      {
        id: 1,
        name: "Category Name",
        description:
          "Category name follows template: [Category] from Rouge Technologies",
        check: () => {
          if (!selectedCategory) return false;
          const expectedName = `${selectedCategory} from Rouge Technologies`;
          return categoryName === expectedName;
        },
        importance: "critical",
        condition: !!selectedCategory,
      },
      {
        id: 2,
        name: "Minimum Paragraphs",
        description:
          "At least 3 paragraphs recommended for comprehensive content",
        check: () => totalParagraphs >= 3,
        importance: "critical",
      },
      {
        id: 3,
        name: "Paragraph Length",
        description: "Each paragraph should be at least 200 characters",
        check: () => totalParagraphs === 0 || !hasShortParagraphs,
        importance: "medium",
        condition: totalParagraphs > 0,
      },
      {
        id: 4,
        name: "Total Content Length",
        description:
          "Total content should be at least 800 characters for good SEO",
        check: () => totalChars >= 800,
        importance: "critical",
        condition: totalChars > 0,
      },
      {
        id: 5,
        name: "Category Keywords",
        description: `Use all category keywords at least once: ${categoryKeywords
          .slice(0, 3)
          .join(", ")}${categoryKeywords.length > 3 ? "..." : ""}`,
        check: () => {
          if (!selectedCategory || categoryKeywords.length === 0) return false;
          return !hasMissingKeywords;
        },
        importance: "critical",
        condition: !!selectedCategory && categoryKeywords.length > 0,
      },
      {
        id: 6,
        name: "Brand Mention",
        description:
          "Content should mention 'Rouge Technologies' at least 2-3 times",
        check: () => {
          if (!selectedCategory || totalChars === 0) return false;
          return (keywordCounts["Rouge Technologies"] || 0) >= 2;
        },
        importance: "medium",
        condition: !!selectedCategory && totalChars > 0,
      },
      {
        id: 7,
        name: "Keyword Density",
        description: "Include each keyword 2-3 times for better SEO",
        check: () => {
          if (!selectedCategory || categoryKeywords.length === 0) return false;
          const categoryKeyCounts = categoryKeywords.map(
            (k) => keywordCounts[k] || 0,
          );
          const avgCount =
            categoryKeyCounts.reduce((a, b) => a + b, 0) /
            categoryKeyCounts.length;
          return avgCount >= 1.5;
        },
        importance: "medium",
        condition: !!selectedCategory && categoryKeywords.length > 0,
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

  // Get overall status (clean version for overallStatusMessage prop)
  const getOverallStatus = () => {
    if (!selectedCategory) return "Select Category";
    if (totalParagraphs === 0) return "Add Content";
    if (totalParagraphs < 3) return `${totalParagraphs}/3 Paragraphs`;
    if (totalChars < 800) return `${totalChars}/800 Chars`;
    if (hasMissingKeywords) return "Add Keywords";
    if (allRulesPass) return "Perfect!";
    return "Almost there!";
  };

  // Get header icon (used for ValidationRules headerIcon prop)
  const getHeaderIcon = () => {
    if (!selectedCategory) return "⚠️";
    if (totalParagraphs === 0) return "❌";
    if (totalParagraphs < 3) return "⚠️";
    if (totalChars < 800) return "⚠️";
    if (hasMissingKeywords) return "⚠️";
    if (allRulesPass) return "✅";
    return "⚠️";
  };

  // Get status badge color (unchanged, for the top banner)
  const badgeColor = getStatusBadgeColorFromState({
    hasCriticalError: !!selectedCategory && totalParagraphs === 0,
    hasWarning:
      !selectedCategory ||
      (totalParagraphs > 0 &&
        (totalParagraphs < 3 ||
          totalChars < 800 ||
          hasMissingKeywords ||
          !allRulesPass)),
    isComplete: allRulesPass,
  });

  // New flags for ValidationWrapper (same logic as before)
  const hasCriticalError = !!selectedCategory && totalParagraphs === 0;
  const hasWarning =
    !selectedCategory ||
    (totalParagraphs > 0 &&
      (totalParagraphs < 3 ||
        totalChars < 800 ||
        hasMissingKeywords ||
        !allRulesPass));

  // Handle new paragraph change
  const handleNewParagraphChange = (e) => {
    const value = e.target.value;
    setNewCategoryParagraph(value);

    if (value.length > 0 && value.length < 200) {
      setLocalCategoryError(
        "Paragraph should be at least 200 characters for good SEO value",
      );
    } else {
      setLocalCategoryError("");
    }
  };

  // Enhanced add paragraph with validation
  const handleAddParagraph = () => {
    if (newCategoryParagraph.trim().length >= 200) {
      addCategoryParagraph();
      setLocalCategoryError("");
    } else {
      setLocalCategoryError("Paragraph must be at least 200 characters");
    }
  };

  const canAddNewParagraph = newCategoryParagraph.trim().length >= 200;
  const isTooShort =
    newCategoryParagraph.length > 0 && newCategoryParagraph.length < 200;
  const isGoodLength = newCategoryParagraph.length >= 200;
  const isRecommendedLength = newCategoryParagraph.length >= 300;

  // Check if content matches default
  const isDefaultContentLoaded = () => {
    if (!selectedCategory || !CATEGORY_SECTIONS[selectedCategory]) return false;

    const defaultSections = CATEGORY_SECTIONS[selectedCategory].sections || [];
    if (sections.length !== defaultSections.length) return false;

    return sections.every((section, index) => {
      const defaultSection = defaultSections[index];
      if (section.subheading !== defaultSection.subheading) return false;
      if (section.paragraphs?.length !== defaultSection.paragraphs?.length)
        return false;

      return (
        section.paragraphs?.every(
          (para, paraIndex) => para === defaultSection.paragraphs[paraIndex],
        ) || false
      );
    });
  };

  return (
    <ValidationWrapper
      validationScore={validationScore}
      hasCriticalError={hasCriticalError}
      hasWarning={hasWarning}
      isComplete={allRulesPass}
    >
      {/* Status banner at the top */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Category SEO Content
          </h3>
          <div className="flex items-center gap-3">
            {/* Default content indicator */}
            {isDefaultContentLoaded() && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full flex items-center gap-1">
                <Check size={12} /> Default
              </span>
            )}
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${badgeColor}`}
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

        {/* Content management buttons - SIMPLIFIED */}
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedCategory && CATEGORY_SECTIONS[selectedCategory] && (
            <>
              <button
                onClick={loadAllDefaultContent}
                disabled={isDefaultContentLoaded()}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                  isDefaultContentLoaded()
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 cursor-not-allowed"
                    : "bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 dark:text-blue-300"
                }`}
                title="Load all default content for this category"
              >
                <Download size={14} />
                Load All Defaults
              </button>

              <button
                onClick={addNewSection}
                className="px-3 py-1.5 text-sm rounded-lg bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/20 dark:hover:bg-green-800/30 dark:text-green-300 flex items-center gap-2 transition-colors"
              >
                <Plus size={14} />
                New Section
              </button>

              {sections.length > 0 && (
                <button
                  onClick={removeAllDefaults}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/20 dark:hover:bg-red-800/30 dark:text-red-300 flex items-center gap-2 transition-colors"
                  title="Remove all content"
                >
                  <Trash2 size={14} />
                  Remove All
                </button>
              )}
            </>
          )}

          {selectedCategory && !CATEGORY_SECTIONS[selectedCategory] && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle size={14} />
              No default content available
            </div>
          )}
        </div>

        {/* Stats display */}
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
          <span>
            Sections: <span className="font-medium">{sections.length}</span>
          </span>
          <span>
            Paragraphs:{" "}
            <span className="font-medium">{totalParagraphs}/3 min</span>
          </span>
          <span>
            Characters:{" "}
            <span className="font-medium">{totalChars}/800 min</span>
          </span>
          <span>
            Keywords:{" "}
            <span className="font-medium">{totalKeywordCount} total</span>
          </span>
          {shortParagraphs > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              ⚠️ {shortParagraphs} short paragraphs
            </span>
          )}
        </div>
      </div>

      {/* Category Name Display */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            Category Name:
          </label>
          <span
            className={`text-sm ${
              selectedCategory &&
              categoryName === `${selectedCategory} from Rouge Technologies`
                ? "text-green-600 dark:text-green-400"
                : !selectedCategory
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {categoryName.length}/100 chars
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            value={categoryName}
            readOnly
            className={`w-full px-4 py-3 border rounded-lg 
                     dark:bg-gray-700 dark:text-gray-100 cursor-not-allowed
                     ${
                       selectedCategory &&
                       categoryName ===
                         `${selectedCategory} from Rouge Technologies`
                         ? "border-green-300 dark:border-green-500 bg-green-50 dark:bg-green-900/20"
                         : !selectedCategory
                           ? "border-yellow-300 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                           : "border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20"
                     }`}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            🔒
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Automatically generated from selected category
          </p>
          {!selectedCategory && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ Select a category above
            </p>
          )}
          {selectedCategory &&
            categoryName !== `${selectedCategory} from Rouge Technologies` && (
              <p className="text-xs text-red-600 dark:text-red-400">
                ❌ Does not match template
              </p>
            )}
        </div>
      </div>

      {/* Content Helper Message */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <span className="mt-0.5">💡</span>
          <span>
            <strong>Start fresh or use defaults:</strong> Begin with a blank
            slate to type your own content from scratch, or load all defaults to
            get started quickly. Type 0 if you want no content.
          </span>
        </p>
      </div>

      {/* Category Selection Warning */}
      {!selectedCategory && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ <strong>Select a category first:</strong> Choose a category from
            the dropdown above to generate the category name automatically and
            access default content options.
          </p>
        </div>
      )}

      {/* Keyword Usage Statistics */}
      {selectedCategory && categoryKeywords.length > 0 && (
        <div
          className={`mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border ${
            hasMissingKeywords || hasMissingBrand
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
                Include category keywords and mention &quot;Rouge
                Technologies&quot; 2-3 times:
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <div
                  className={`p-2 rounded border text-center transition-all duration-300 ${
                    !keywordCounts["Rouge Technologies"] ||
                    keywordCounts["Rouge Technologies"] === 0
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : keywordCounts["Rouge Technologies"] === 1
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                        : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                  }`}
                >
                  <div
                    className="font-medium text-sm mb-1 truncate"
                    title="Rouge Technologies"
                  >
                    Rouge Technologies
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      !keywordCounts["Rouge Technologies"] ||
                      keywordCounts["Rouge Technologies"] === 0
                        ? "text-red-600 dark:text-red-400"
                        : keywordCounts["Rouge Technologies"] === 1
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {keywordCounts["Rouge Technologies"] || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {!keywordCounts["Rouge Technologies"] ||
                    keywordCounts["Rouge Technologies"] === 0
                      ? "Missing"
                      : keywordCounts["Rouge Technologies"] === 1
                        ? "Low"
                        : "Good"}
                  </div>
                </div>

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

              {(hasMissingKeywords || hasMissingBrand) && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ Missing keywords! Add at least one occurrence of each
                    keyword and mention &quot;Rouge Technologies&quot; 2-3
                    times.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {hasMissingKeywords || hasMissingBrand ? (
                  <span className="text-red-600 dark:text-red-400">
                    {
                      Object.values(keywordCounts).filter((c, i, arr) =>
                        i === arr.length - 1 ? c < 2 : c === 0,
                      ).length
                    }{" "}
                    keywords missing/insufficient
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

      {/* Sections Display */}
      <div className="space-y-4 my-4">
        <div className="flex justify-between items-center">
          <label className="block text-black dark:text-gray-100 font-medium">
            Content Sections ({sections.length}):
          </label>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Active Section:{" "}
            <select
              value={activeSectionIndex}
              onChange={(e) => setActiveSectionIndex(parseInt(e.target.value))}
              className="ml-2 px-2 py-1 border rounded dark:bg-gray-700"
              disabled={sections.length === 0}
            >
              {sections.map((section, index) => (
                <option key={index} value={index}>
                  {section.subheading || `Section ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sections.length > 0 ? (
          sections.map((section, sectionIndex) => {
            const sectionParagraphs = section.paragraphs || [];
            return (
              <div
                key={sectionIndex}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={section.subheading || ""}
                      onChange={(e) =>
                        updateSectionSubheading(sectionIndex, e.target.value)
                      }
                      placeholder="Section subheading (optional)"
                      className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-gray-100 text-lg font-medium"
                    />
                  </div>
                  <button
                    onClick={() => removeSection(sectionIndex)}
                    className="ml-3 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/20 dark:hover:bg-red-800/30 dark:text-red-300 rounded flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>

                <div className="space-y-3">
                  {sectionParagraphs.length > 0 ? (
                    sectionParagraphs.map((paragraph, paraIndex) => {
                      const isShort = paragraph.length < 200;
                      const wordCount = paragraph.split(/\s+/).length;
                      const keywordMatches = categoryKeywords.reduce(
                        (acc, keyword) => {
                          const regex = new RegExp(
                            `\\b${keyword.toLowerCase()}\\b`,
                            "gi",
                          );
                          const matches = paragraph.match(regex);
                          return matches ? acc + matches.length : acc;
                        },
                        0,
                      );
                      const hasRouge = /\brouge technologies\b/gi.test(
                        paragraph,
                      );

                      return (
                        <div
                          key={paraIndex}
                          className={`p-3 rounded border transition-all duration-300 ${
                            isShort
                              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                          } hover:border-blue-300 dark:hover:border-blue-600`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Paragraph {paraIndex + 1}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                • {wordCount} words • {paragraph.length} chars
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
                              {hasRouge && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                  Brand
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                removeCategoryParagraph(sectionIndex, paraIndex)
                              }
                              className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors flex items-center gap-1"
                            >
                              <X size={12} />
                              Remove
                            </button>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {paragraph}
                          </p>
                          {isShort && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center">
                              ⚠️ Consider expanding this paragraph (
                              {200 - paragraph.length} more chars needed)
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center border-2 border-dashed border-gray-300 rounded">
                      <p className="text-gray-500 dark:text-gray-400">
                        No paragraphs in this section yet. Add paragraphs below.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setActiveSectionIndex(sectionIndex)}
                    className={`px-3 py-1 text-sm rounded ${
                      activeSectionIndex === sectionIndex
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {activeSectionIndex === sectionIndex
                      ? "✓ Active for adding"
                      : "Make Active"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 bg-gray-100 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              {!selectedCategory
                ? "Select a category above to start adding SEO content"
                : "No content yet. Start typing below or load defaults to begin."}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Type your own content from scratch or use the defaults as a
              starting point
            </p>
          </div>
        )}
      </div>

      {/* Add New Paragraph */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-black dark:text-gray-100 font-medium">
            Add New Paragraph:
            {sections.length > 0 && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                to{" "}
                {sections[activeSectionIndex]?.subheading
                  ? `"${sections[activeSectionIndex].subheading}"`
                  : `Section ${activeSectionIndex + 1}`}
              </span>
            )}
          </label>
          <span
            className={`text-sm ${
              newCategoryParagraph.length >= 200
                ? "text-green-600 dark:text-green-400"
                : newCategoryParagraph.length === 0
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-yellow-600 dark:text-yellow-400"
            }`}
          >
            {newCategoryParagraph.length}/200 chars
            {newCategoryParagraph.length > 0 &&
              newCategoryParagraph.length < 200 &&
              ` (need ${200 - newCategoryParagraph.length} more)`}
          </span>
        </div>

        <div className="space-y-3">
          <textarea
            value={newCategoryParagraph}
            onChange={handleNewParagraphChange}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 
                     dark:bg-gray-700 dark:text-gray-100
                     ${
                       canAddNewParagraph
                         ? "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400"
                         : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                     }`}
            placeholder={
              !selectedCategory
                ? "Select a category above to start writing SEO content..."
                : sections.length === 0
                  ? "Add a section first, then write paragraphs here..."
                  : `Write a detailed SEO paragraph... Include keywords: ${categoryKeywords
                      .slice(0, 2)
                      .join(", ")}...`
            }
            rows={4}
            disabled={!selectedCategory || sections.length === 0}
          />

          {/* Length indicator bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>0</span>
              <span
                className={
                  isGoodLength
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : isTooShort && newCategoryParagraph.length > 0
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : ""
                }
              >
                200 (min)
              </span>
              <span
                className={
                  isRecommendedLength
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : ""
                }
              >
                300+ (recommended)
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-300 ${
                  isTooShort
                    ? "bg-red-500"
                    : isGoodLength && !isRecommendedLength
                      ? "bg-green-500"
                      : isRecommendedLength
                        ? "bg-blue-500"
                        : newCategoryParagraph.length > 0
                          ? "bg-blue-500"
                          : "bg-transparent"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (newCategoryParagraph.length / 500) * 100,
                  )}%`,
                }}
              />
              <div
                className="h-2 w-0.5 bg-gray-400 absolute top-0"
                style={{
                  left: `${(200 / 500) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              />
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
                  isGoodLength && !isRecommendedLength
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : isRecommendedLength
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : ""
                }
              >
                {isRecommendedLength ? "Excellent!" : "Good length"}
              </span>
              <span
                className={
                  isRecommendedLength
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : ""
                }
              >
                Recommended
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddParagraph}
              disabled={
                !canAddNewParagraph ||
                !selectedCategory ||
                sections.length === 0
              }
              className={`flex-1 px-4 py-3 rounded-lg transition-all duration-300 ${
                canAddNewParagraph && selectedCategory && sections.length > 0
                  ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white shadow-md"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {!selectedCategory
                ? "Select Category First"
                : sections.length === 0
                  ? "Add Section First"
                  : canAddNewParagraph
                    ? "+ Add Paragraph"
                    : "Need 200+ characters"}
            </button>
          </div>
        </div>

        {/* Show local error message */}
        {localCategoryError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              ⚠️ {localCategoryError}
            </p>
          </div>
        )}
      </div>

      {/* ========== REPLACED VALIDATION RULES SECTION ========== */}
      <ValidationRules
        rules={displayRules}
        headerIcon={getHeaderIcon()}
        headerText="SEO Content Requirements:"
        validationScore={validationScore}
        allRulesPass={allRulesPass}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={getOverallStatus()}
      />
    </ValidationWrapper>
  );
}
