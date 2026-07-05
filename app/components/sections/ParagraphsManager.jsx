// app/components/forms/sections/ParagraphsManager.jsx
"use client";

import { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  X,
  Search,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { AIGenerateButton } from "../AIGenerateButton";

export default function ParagraphsManager({
  paragraphs,
  setParagraphs,
  categoryKeywords = [],
  productTitle = "",
  categoryName = "",
  specifications = [],
  features = [],
}) {
  const [newParagraph, setNewParagraph] = useState("");
  const [localParagraphsError, setLocalParagraphsError] = useState("");
  const [keywordCounts, setKeywordCounts] = useState({});
  const [showKeywordStats, setShowKeywordStats] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);

  const validateParagraph = (text) => {
    if (text.length < 160) {
      return "Paragraph should include as much important detail as possible (minimum 160 characters recommended).";
    }
    return "";
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewParagraph("");
    setLocalParagraphsError("");
  };

  const addOrUpdateParagraph = () => {
    const validationMsg = validateParagraph(newParagraph);
    if (newParagraph.trim() && !validationMsg.includes("required")) {
      if (editingIndex !== null) {
        const updatedParagraphs = [...paragraphs];
        updatedParagraphs[editingIndex] = newParagraph;
        setParagraphs(updatedParagraphs);
        cancelEdit();
      } else {
        setParagraphs([...paragraphs, newParagraph]);
        setNewParagraph("");
        setLocalParagraphsError("");
      }
    } else if (validationMsg) {
      setLocalParagraphsError(validationMsg);
    }
  };

  const removeParagraph = (index) => {
    setParagraphs(paragraphs.filter((_, i) => i !== index));
    if (editingIndex === index) {
      cancelEdit();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const editParagraph = (index) => {
    setNewParagraph(paragraphs[index]);
    setEditingIndex(index);
    setLocalParagraphsError("");
  };

  const handleNewParagraphChange = (e) => {
    const value = e.target.value;
    setNewParagraph(value);
    if (value.length > 100) {
      const validationMsg = validateParagraph(value);
      setLocalParagraphsError(validationMsg);
    }
  };

  useEffect(() => {
    if (categoryKeywords.length > 0) {
      const allText = paragraphs.join(" ").toLowerCase();
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
  }, [paragraphs, categoryKeywords]);

  const hasMissingKeywords =
    categoryKeywords.length > 0 &&
    Object.values(keywordCounts).some((count) => count === 0);
  const totalKeywordCount = Object.values(keywordCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const totalChars = paragraphs.reduce((sum, para) => sum + para.length, 0);
  const avgParaLength =
    paragraphs.length > 0 ? Math.round(totalChars / paragraphs.length) : 0;

  const isTooShort = newParagraph.length > 0 && newParagraph.length < 160;
  const isGoodLength = newParagraph.length >= 160;
  const canAddOrUpdate = newParagraph.trim().length >= 160;

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
        description: `Use all category keywords at least once: ${categoryKeywords.slice(0, 3).join(", ")}${
          categoryKeywords.length > 3 ? "..." : ""
        }`,
        check: () =>
          categoryKeywords.length === 0 ? false : !hasMissingKeywords,
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
          return avgCount >= 1.5;
        },
        importance: "medium",
        condition: categoryKeywords.length > 0,
      },
    ];
    return rules;
  };

  const validationRules = checkValidationRules();
  const displayRules = validationRules.filter(
    (rule) => rule.condition !== false,
  );
  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(displayRules);

  const getOverallStatus = () => {
    if (paragraphs.length === 0) return "Add Paragraphs";
    if (!categoryKeywords.length) return "Select Category";
    if (hasMissingKeywords) return "Add Keywords";
    if (allRulesPass) return "Perfect!";
    return "Almost there!";
  };

  const getHeaderIcon = () => {
    if (paragraphs.length === 0) return AlertCircle;
    if (!categoryKeywords.length) return AlertCircle;
    if (hasMissingKeywords) return AlertCircle;
    if (allRulesPass) return CheckCircle;
    return AlertCircle;
  };

  const hasCriticalError = paragraphs.length === 0;
  const hasWarning =
    paragraphs.length > 0 &&
    (!categoryKeywords.length || hasMissingKeywords || !allRulesPass);
  const subtitleStats = `Paragraphs: ${paragraphs.length}, Keywords: ${totalKeywordCount} total, Avg length: ${avgParaLength} chars`;

  return (
    <ValidationWrapper
      validationScore={validationScore}
      hasCriticalError={hasCriticalError}
      hasWarning={hasWarning}
      isComplete={allRulesPass}
    >
      <StatusHeader
        title="Detailed Paragraphs"
        status={getOverallStatus()}
        hasCriticalError={hasCriticalError}
        hasWarning={hasWarning}
        isComplete={allRulesPass}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle={subtitleStats}
      />
      <div className="flex my-2 w-full">
        <AIGenerateButton
          task="paragraphs"
          payload={{
            title: productTitle,
            category: categoryName,
            specifications,
            features,
            keywords: categoryKeywords,
          }}
          onSuccess={(data) =>
            data.paragraphs && setParagraphs(data.paragraphs)
          }
          successMessage="Description generated successfully!"
          disabled={!productTitle || !categoryName}
        >
          Generate Description
        </AIGenerateButton>
      </div>

      {categoryKeywords.length > 0 && (
        <div
          className={`mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border ${
            hasMissingKeywords
              ? "border-yellow-200 dark:border-yellow-800"
              : "border-gray-200 dark:border-gray-700"
          } transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-black dark:text-gray-100 flex items-center gap-2">
              <Search className="h-4 w-4" /> Keyword Usage ({totalKeywordCount}{" "}
              total)
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

      <div className="space-y-3 my-4">
        {paragraphs.length === 0 ? (
          <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No paragraphs yet. Add your first paragraph or use AI to generate
              a description.
            </p>
          </div>
        ) : (
          paragraphs.map((para, index) => {
            const keywordMatches =
              categoryKeywords.length > 0
                ? categoryKeywords.reduce((acc, keyword) => {
                    const regex = new RegExp(
                      `\\b${keyword.toLowerCase()}\\b`,
                      "gi",
                    );
                    const matches = para.match(regex);
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
                    : para.length >= 160
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
                    {isEditingThis && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        (editing)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editParagraph(index)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-sm transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => removeParagraph(index)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{para}</p>
                {!isEditingThis && para.length < 160 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Needs{" "}
                    {160 - para.length} more characters (minimum 160)
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-black dark:text-gray-100 font-medium">
            {editingIndex !== null ? "Edit Paragraph:" : "Add New Paragraph:"}
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

        <div className="w-full flex flex-col gap-4">
          <div className="w-full">
            <textarea
              value={newParagraph}
              onChange={handleNewParagraphChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-gray-100 ${
                newParagraph.length === 0
                  ? "border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                  : newParagraph.length < 160
                    ? "border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
                    : "border-green-300 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-400"
              }`}
              placeholder={
                categoryKeywords.length > 0
                  ? `Write detailed paragraph including keywords: ${categoryKeywords.slice(0, 3).join(", ")}${
                      categoryKeywords.length > 3 ? "..." : ""
                    } (minimum 160 characters)`
                  : "Write detailed paragraph with specifications, features, and benefits... (minimum 160 characters)"
              }
              rows={3}
            />

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
                    width: `${Math.min(100, (newParagraph.length / 500) * 100)}%`,
                  }}
                />
                <div
                  className="h-2 w-0.5 bg-gray-400 absolute top-0"
                  style={{
                    left: `${(160 / 500) * 100}%`,
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
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {localParagraphsError}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={addOrUpdateParagraph}
              disabled={!canAddOrUpdate}
              className={`flex-1 px-4 py-3 rounded-lg transition-all duration-300 ${
                canAddOrUpdate
                  ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white shadow-md"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {editingIndex !== null ? "Update Paragraph" : "Add Paragraph"}
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
      </div>

      <ValidationRules
        rules={displayRules}
        headerIcon={getHeaderIcon()}
        headerText="Description Requirements"
        validationScore={validationScore}
        allRulesPass={allRulesPass}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={getOverallStatus()}
      />
    </ValidationWrapper>
  );
}
