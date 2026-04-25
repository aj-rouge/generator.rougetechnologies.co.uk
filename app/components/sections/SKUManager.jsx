"use client";

import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { VALIDATION_COLORS } from "../../utils/ui/validationColors";
import AIAutofillButton from "../AIAutofillButton";

const formatSnippet = (text) => {
  if (!text) return "";
  // Remove special characters, uppercase it, take first 3-4 chars
  return text
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 4);
};

const mapConditionToSku = (condition) => {
  const map = {
    New: "NEW",
    "Open Box": "ONU",
    Refurbished: "REF",
    Used: "USE",
    "Manufacturer Refurbished": "REF",
    "Seller Refurbished": "SER",
    "For parts or not working": "PAR",
    "Like New": "LIK",
  };
  return map[condition] || "NEW";
};

export const suggestSkuFromTitle = (title, condition) => {
  if (!title) return "";

  const words = title.trim().split(/\s+/);
  const brand = formatSnippet(words[0]); // First word usually brand
  const type = formatSnippet(words[1]); // Second word usually type

  // Grab the "middle" parts as specs (if they exist)
  const specs = words
    .slice(2, -1)
    .map((w) => formatSnippet(w))
    .filter((w) => w.length > 0)
    .join("-");

  // Last word is often the color
  const color = words.length > 2 ? formatSnippet(words[words.length - 1]) : "";

  const cond = mapConditionToSku(condition);

  // Filter out empty parts and join with dashes
  return [brand, type, specs, color, cond]
    .filter((part) => part && part.length > 0)
    .join("-");
};

// Validate SKU format
const validateSkuFormat = (sku) => {
  if (!sku) return { isValid: false, error: "SKU is empty" };

  const parts = sku.split("-");
  if (parts.length < 3) {
    return {
      isValid: false,
      error: "SKU needs at least 3 segments (BRAND-TYPE-CONDITION)",
    };
  }

  // Check each segment length
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

  // Check condition code is valid
  const validConditions = ["NEW", "ONU", "REF", "USE", "SER", "PAR", "LIK"];
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
  const handleGenerateSku = () => {
    const suggested = suggestSkuFromTitle(title, condition);
    onSkuChange(suggested);
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
        name: "Title-Based Generation",
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
            ? "⚠️ Warning: Brand code doesn't match title. Consider generating from title."
            : null,
      },
      {
        id: 4,
        name: "Condition Code Valid",
        description:
          "Last segment should be valid condition code (NEW, ONU, REF, USE)",
        check: () => {
          if (!sku) return false;
          const validation = validateSkuFormat(sku);
          return validation.isValid;
        },
        importance: "critical",
        condition: !!sku,
        errorMessage: null, // Already covered in format validation
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

  // Get overall status
  const getOverallStatus = () => {
    if (!sku) {
      return "⚠️ Enter SKU";
    }
    if (allRulesPass) {
      return "✓ Valid SKU";
    }
    return "⚠️ Needs Attention";
  };

  // Get header icon based on validation status
  const getHeaderIcon = () => {
    if (!sku) return VALIDATION_COLORS.icon.critical;
    if (allRulesPass) return VALIDATION_COLORS.icon.success;
    return VALIDATION_COLORS.icon.warning;
  };

  // Format subtitle for StatusHeader
  const getSubtitle = () => {
    if (!sku) return null;

    const parts = sku.split("-");
    const brand = parts[0] || "";
    const type = parts[1] || "";
    const conditionCode = parts[parts.length - 1] || "";

    return `Format: ${brand}-${type}-[...]-${conditionCode}`;
  };

  // Parse SKU for display
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
              onClick={handleGenerateSku}
              disabled={!title || !condition}
              className={`text-sm px-3 py-1 rounded transition-colors ${
                !title || !condition
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              ⚡ Generate from Title
            </button>
            <AIAutofillButton
              section="sku"
              categoryKeywords={[]}
              existingData={{ title, condition }}
              onUpdate={(newSku) => onSkuChange(newSku)}
              disabled={!title || !condition}
              buttonText="✨ AI SKU"
              size="sm"
            />
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

        {/* SKU Breakdown */}
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
                    ["NEW", "REF", "ONU"].includes(skuParts.condition)
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

        {/* Examples */}
        <div className="mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Format examples:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">
              APP-IPA-PRO-11I-SIL-NEW
            </code>
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">
              PHI-TOO-SON-7900-BLA-REF
            </code>
            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">
              RING-DOOR-VID-BATT-ONU
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
