// app/components/forms/sections/SKUManager.jsx
"use client";

import {
  AlertCircle,
  CheckCircle,
  Package,
  BarChart3,
  Zap,
} from "lucide-react";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { AIGenerateButton } from "../AIGenerateButton";

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

  // Valid condition codes: single-part and hyphenated
  const validSimpleConditions = ["NEW", "USE"];
  const validHyphenatedConditions = ["EX-REF", "VG-REF", "GD-REF"];

  // Check last segment for simple codes
  const lastSegment = parts[parts.length - 1];
  if (validSimpleConditions.includes(lastSegment)) {
    return { isValid: true, error: null };
  }

  // Check last two segments combined for hyphenated codes
  if (parts.length >= 2) {
    const lastTwo = parts.slice(-2).join("-");
    if (validHyphenatedConditions.includes(lastTwo)) {
      return { isValid: true, error: null };
    }
  }

  // If we reach here, condition code is invalid
  const allValid = [...validSimpleConditions, ...validHyphenatedConditions];
  return {
    isValid: false,
    error: `Invalid condition code. Use: ${allValid.join(", ")}`,
  };
};

export default function SKUManager({ sku, title, condition, onSkuChange }) {
  const getConditionCodeFromSku = (sku) => {
    if (!sku) return null;
    const parts = sku.split("-");
    const lastSegment = parts[parts.length - 1];
    const validSimple = ["NEW", "USE"];
    if (validSimple.includes(lastSegment)) return lastSegment;
    if (parts.length >= 2) {
      const lastTwo = parts.slice(-2).join("-");
      const validHyphenated = ["EX-REF", "VG-REF", "GD-REF"];
      if (validHyphenated.includes(lastTwo)) return lastTwo;
    }
    return lastSegment;
  };

  const checkValidationRules = () => {
    const skuValidation = validateSkuFormat(sku);
    const isValidCondition = skuValidation.isValid;
    const rules = [
      {
        id: 1,
        name: "SKU Required",
        description: "Enter a unique SKU identifier",
        check: () => !!sku && sku.trim().length > 0,
        importance: "critical",
        errorMessage:
          !sku || sku.trim().length === 0
            ? "Missing: Please enter a SKU"
            : null,
      },
      {
        id: 2,
        name: "Valid SKU Format",
        description:
          "Format: BRAND-TYPE-[SPECS]-[COLOR]-CONDITION (e.g., APP-IPA-PRO-11I-SIL-NEW)",
        check: () => !!sku && validateSkuFormat(sku).isValid,
        importance: "critical",
        condition: !!sku,
        errorMessage:
          sku && !validateSkuFormat(sku).isValid
            ? `Format Error: ${validateSkuFormat(sku).error}`
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
          return skuParts[0] === suggestedParts[0];
        },
        importance: "warning",
        condition: !!sku && !!title,
        errorMessage:
          sku &&
          title &&
          sku.split("-")[0] !==
            suggestSkuFromTitle(title, condition).split("-")[0]
            ? "Warning: Brand code doesn't match title. Consider generating with AI."
            : null,
      },
      {
        id: 4,
        name: "Condition Code Valid",
        description:
          "Last segment(s) must be a valid condition code (NEW, USE, EX-REF, VG-REF, GD-REF)",
        check: () => isValidCondition,
        importance: "critical",
        condition: !!sku,
        errorMessage:
          !isValidCondition && sku ? validateSkuFormat(sku).error : null,
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
    if (!sku) return "Enter SKU";
    if (allRulesPass) return "Valid SKU";
    return "Needs Attention";
  };

  const getHeaderIcon = () => {
    if (!sku) return AlertCircle;
    if (allRulesPass) return CheckCircle;
    return AlertCircle;
  };

  const getSubtitle = () => {
    if (!sku) return null;
    const parts = sku.split("-");
    const brand = parts[0] || "";
    const type = parts[1] || "";
    const conditionCode = getConditionCodeFromSku(sku);
    return `Format: ${brand}-${type}-[...]-${conditionCode}`;
  };

  const parseSkuForDisplay = () => {
    if (!sku) return null;
    const parts = sku.split("-");
    if (parts.length < 2) return null;
    let conditionCode = parts[parts.length - 1];
    const validHyphenated = ["EX-REF", "VG-REF", "GD-REF"];
    if (
      parts.length >= 2 &&
      validHyphenated.includes(parts.slice(-2).join("-"))
    ) {
      conditionCode = parts.slice(-2).join("-");
    }
    const specsEndIndex = conditionCode.includes("-")
      ? parts.length - 2
      : parts.length - 1;
    const specsParts = parts.slice(2, specsEndIndex);
    return {
      brand: parts[0],
      type: parts[1],
      specs: specsParts.join("-"),
      condition: conditionCode,
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
        <div className="flex items-center justify-between">
          <label className="text-black dark:text-gray-100 font-medium">
            Product SKU:
          </label>
          <div className="flex gap-2">
            <AIGenerateButton
              endpoint="/api/generate-sku"
              body={{ title, condition }}
              onSuccess={(data) => data.sku && onSkuChange(data.sku)}
              fallback={() =>
                onSkuChange(suggestSkuFromTitle(title, condition))
              }
              successMessage="SKU generated successfully!"
              disabled={!title || !condition}
            >
              Generate SKU
            </AIGenerateButton>
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
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> SKU Breakdown:
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
                    validateSkuFormat(sku).isValid
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
