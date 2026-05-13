// app/components/forms/sections/SKUManager.jsx
"use client";

import { useState } from "react";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { VALIDATION_COLORS } from "../../utils/ui/validationColors";
import { useNotification } from "../../context/NotificationContext";

const formatSnippet = (text) => {
  if (!text) return "";
  return text
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 4);
};

// Updated mapping for the new SKU condition codes
const mapConditionToAbbreviation = (condition) => {
  const map = {
    New: "NEW",
    Used: "USE",
    "Excellent Refurbished": "EX-REF",
    "Very Good Refurbished": "VG-REF",
    "Good Refurbished": "GD-REF",
  };
  return map[condition] || null;
};

// Fallback heuristic – still used if AI call fails
export const suggestSkuFromTitle = (title, condition) => {
  if (!title) return "";

  const words = title.trim().split(/\s+/);
  const brand = formatSnippet(words[0]);
  const type = formatSnippet(words[1]);
  const specs = words
    .slice(2, -1)
    .map((w) => formatSnippet(w))
    .filter((w) => w.length > 0)
    .join("-");
  const color = words.length > 2 ? formatSnippet(words[words.length - 1]) : "";

  const cond = mapConditionToAbbreviation(condition) || "";
  // If condition not mapped, exclude it (or fallback to empty)
  return [brand, type, specs, color, cond]
    .filter((part) => part && part.length > 0)
    .join("-");
};

// Validate SKU format, now supporting EX-REF etc.
const validateSkuFormat = (sku) => {
  if (!sku) return { isValid: false, error: "SKU is empty" };

  const parts = sku.split("-");
  if (parts.length < 3) {
    return {
      isValid: false,
      error: "SKU needs at least 3 segments (BRAND-TYPE-CONDITION)",
    };
  }

  for (const part of parts) {
    if (part.length === 0) {
      return { isValid: false, error: "SKU contains empty segments" };
    }
    if (part.length > 6) {
      return {
        isValid: false,
        error: `Segment "${part}" too long (max 6 chars)`,
      };
    }
  }

  // Valid condition codes as per new spec
  const validConditions = ["NEW", "USE", "EX-REF", "VG-REF", "GD-REF"];
  const lastPart = parts[parts.length - 1];
  if (!validConditions.includes(lastPart)) {
    return {
      isValid: false,
      error: `Invalid condition code: ${lastPart}. Use: ${validConditions.join(", ")}`,
    };
  }

  return { isValid: true, error: null };
};

export default function SKUManager({ sku, title, condition, onSkuChange }) {
  const { addNotification } = useNotification();
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAiGenerate = async () => {
    if (!title || !condition) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/generate-sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, condition }),
      });
      const data = await res.json();
      if (data.sku) {
        onSkuChange(data.sku);
      } else {
        throw new Error(data.error || "No SKU generated");
      }
    } catch (error) {
      console.error("AI SKU generation failed, using fallback:", error);
      // Fallback to heuristic
      const fallback = suggestSkuFromTitle(title, condition);
      onSkuChange(fallback);
      addNotification({
        message: `AI generation failed, using heuristic: ${error.message}`,
        type: "warning",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Validation rules checker
  const checkValidationRules = () => {
    const skuValidation = validateSkuFormat(sku);

    const rules = [
      {
        id: 1,
        name: "SKU Required",
        description: "Enter a unique SKU identifier",
        check: () => !!sku && sku.trim().length > 0,
        importance: "critical",
        errorMessage:
          !sku || sku.trim().length === 0
            ? "❌ Missing: Please enter a SKU"
            : null,
      },
      {
        id: 2,
        name: "Valid SKU Format",
        description:
          "Format: BRAND-TYPE-[SPECS]-[COLOR]-CONDITION (e.g., APP-IPA-PRO-11I-SIL-NEW)",
        check: () => {
          if (!sku) return false;
          const validation = validateSkuFormat(sku);
          return validation.isValid;
        },
        importance: "critical",
        condition: !!sku,
        errorMessage:
          sku && !validateSkuFormat(sku).isValid
            ? `❌ Format Error: ${validateSkuFormat(sku).error}`
            : null,
      },
      {
        id: 3,
        name: "Title-Based Pattern",
        description: "SKU should match product title",
        check: () => {
          if (!sku || !title) return false;
          const suggested = suggestSkuFromTitle(title, condition);
          const skuParts = sku.split("-");
          const suggestedParts = suggested.split("-");

          // Check if first segment (brand) matches
          return skuParts[0] === suggestedParts[0];
        },
        importance: "warning",
        condition: !!sku && !!title,
        errorMessage:
          sku &&
          title &&
          sku.split("-")[0] !==
            suggestSkuFromTitle(title, condition).split("-")[0]
            ? "⚠️ Warning: Brand code doesn't match title. Consider generating with AI."
            : null,
      },
      {
        id: 4,
        name: "Condition Code Valid",
        description:
          "Last segment must be a valid condition code (NEW, USE, EX-REF, VG-REF, GD-REF)",
        check: () => {
          if (!sku) return false;
          const validation = validateSkuFormat(sku);
          return validation.isValid;
        },
        importance: "critical",
        condition: !!sku,
        errorMessage: null,
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
    if (!sku) return "⚠️ Enter SKU";
    if (allRulesPass) return "✓ Valid SKU";
    return "⚠️ Needs Attention";
  };

  const getHeaderIcon = () => {
    if (!sku) return VALIDATION_COLORS.icon.critical;
    if (allRulesPass) return VALIDATION_COLORS.icon.success;
    return VALIDATION_COLORS.icon.warning;
  };

  const getSubtitle = () => {
    if (!sku) return null;
    const parts = sku.split("-");
    const brand = parts[0] || "";
    const type = parts[1] || "";
    const conditionCode = parts[parts.length - 1] || "";
    return `Format: ${brand}-${type}-[...]-${conditionCode}`;
  };

  const parseSkuForDisplay = () => {
    if (!sku) return null;
    const parts = sku.split("-");
    if (parts.length < 2) return null;
    return {
      brand: parts[0],
      type: parts[1],
      specs: parts.slice(2, -1).join("-"),
      condition: parts[parts.length - 1],
    };
  };

  const skuParts = parseSkuForDisplay();

  return (
    <ValidationWrapper validationScore={validationScore}>
      <StatusHeader
        title="Product SKU"
        status={getOverallStatus()}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle={getSubtitle()}
      />

      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between mb-4">
          <label className="text-black dark:text-gray-100 font-medium">
            Product SKU:
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={!title || !condition || aiGenerating}
              className={`text-sm px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                !title || !condition || aiGenerating
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {aiGenerating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                "🤖 AI Generate SKU"
              )}
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="e.g., APP-IPA-PRO-11I-256G-SIL-NEW"
          className={`w-full p-3 font-mono text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none ${
            !sku
              ? "border-yellow-300 dark:border-yellow-500"
              : validateSkuFormat(sku).isValid
                ? "border-green-300 dark:border-green-500"
                : "border-red-300 dark:border-red-500"
          }`}
          value={sku || ""}
          onChange={(e) => onSkuChange(e.target.value.toUpperCase())}
        />

        {skuParts && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📊 SKU Breakdown:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Brand
                </div>
                <div className="font-mono font-bold">{skuParts.brand}</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Type
                </div>
                <div className="font-mono font-bold">{skuParts.type}</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Specs
                </div>
                <div className="font-mono text-xs truncate">
                  {skuParts.specs || "-"}
                </div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Condition
                </div>
                <div
                  className={`font-mono font-bold ${
                    [
                      "NEW",
                      "REF",
                      "ONU",
                      "EX-REF",
                      "VG-REF",
                      "GD-REF",
                    ].includes(skuParts.condition)
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                >
                  {skuParts.condition}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Format examples:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">
              APP-IPA-PRO-11I-SIL-NEW
            </code>
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">
              PHI-TOO-SON-7900-BLA-VG-REF
            </code>
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">
              RING-DOOR-VID-BATT-USE
            </code>
          </div>
        </div>
      </div>

      <ValidationRules
        rules={displayRules}
        headerIcon={getHeaderIcon()}
        headerText="SKU Requirements"
        validationScore={validationScore}
        allRulesPass={allRulesPass}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={
          !sku ? "Enter SKU" : allRulesPass ? "Perfect!" : "Needs work"
        }
      />
    </ValidationWrapper>
  );
}
