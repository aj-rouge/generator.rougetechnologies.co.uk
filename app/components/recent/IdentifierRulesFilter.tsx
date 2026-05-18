"use client";

import {
  IdentifierField,
  IdentifierRule,
} from "../../utils/d1/getRecentProducts";

interface IdentifierRulesFilterProps {
  value: Partial<Record<IdentifierField, IdentifierRule>>;
  onChange: (rules: Partial<Record<IdentifierField, IdentifierRule>>) => void;
  className?: string;
  vertical?: boolean;
}

const fields: { value: IdentifierField; label: string }[] = [
  { value: "baselinker_id", label: "BaserLinker ID" },
  { value: "shopify_id", label: "Shopify ID" },
  { value: "asin", label: "ASIN" },
  { value: "ean", label: "EAN" },
  { value: "note", label: "Note" },
];

const ruleOptions: { value: IdentifierRule; label: string }[] = [
  { value: "ignored", label: "Any" },
  { value: "required", label: "Must have" },
  { value: "forbidden", label: "Must NOT have" },
];

export function IdentifierRulesFilter({
  value,
  onChange,
  className = "",
  vertical = false,
}: IdentifierRulesFilterProps) {
  const updateRule = (field: IdentifierField, rule: IdentifierRule) => {
    const newRules = { ...value };
    if (rule === "ignored") {
      delete newRules[field];
    } else {
      newRules[field] = rule;
    }
    onChange(newRules);
  };

  if (vertical) {
    return (
      <div className={`space-y-3 ${className}`}>
        {fields.map((field) => (
          <div key={field.value} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.label}
            </span>
            <div className="flex gap-2">
              {ruleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateRule(field.value, opt.value)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    (value[field.value] || "ignored") === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop horizontal layout: each field with a compact select dropdown
  return (
    <div className={`flex flex-wrap gap-3 items-center ${className}`}>
      {fields.map((field) => (
        <div key={field.value} className="flex items-center gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {field.label}:
          </span>
          <select
            value={value[field.value] || "ignored"}
            onChange={(e) =>
              updateRule(field.value, e.target.value as IdentifierRule)
            }
            className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ruleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
