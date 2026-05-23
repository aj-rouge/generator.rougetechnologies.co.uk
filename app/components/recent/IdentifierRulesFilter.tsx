"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
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

const allFields: { value: IdentifierField; label: string }[] = [
  { value: "baselinker_id", label: "BaserLinker ID" },
  { value: "shopify_id", label: "Shopify ID" },
  { value: "asin", label: "ASIN" },
  { value: "ean", label: "EAN" },
  { value: "note", label: "Note" },
];

const ruleOptions: { value: IdentifierRule; label: string }[] = [
  { value: "required", label: "Must have" },
  { value: "forbidden", label: "Must NOT have" },
];

type RuleItem = {
  id: string; // for React key and stable identity
  field: IdentifierField;
  rule: IdentifierRule;
};

export function IdentifierRulesFilter({
  value,
  onChange,
  className = "",
  vertical = false,
}: IdentifierRulesFilterProps) {
  // Convert value prop to internal array of items (fields with "ignored" are excluded)
  const [items, setItems] = useState<RuleItem[]>(() => {
    const initialItems: RuleItem[] = [];
    for (const [field, rule] of Object.entries(value)) {
      if (rule !== "ignored") {
        initialItems.push({
          id: crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36),
          field: field as IdentifierField,
          rule: rule as IdentifierRule,
        });
      }
    }
    return initialItems;
  });

  // Keep local items in sync when external value changes (e.g., clear all filters)
  useEffect(() => {
    const newItems: RuleItem[] = [];
    for (const [field, rule] of Object.entries(value)) {
      if (rule !== "ignored") {
        newItems.push({
          id: crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36),
          field: field as IdentifierField,
          rule: rule as IdentifierRule,
        });
      }
    }
    setItems(newItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Update parent whenever internal items change
  const updateParent = (newItems: RuleItem[]) => {
    const newValue: Partial<Record<IdentifierField, IdentifierRule>> = {};
    for (const item of newItems) {
      newValue[item.field] = item.rule;
    }
    onChange(newValue);
    setItems(newItems);
  };

  const addItem = () => {
    // Find first field that is not already used
    const usedFields = new Set(items.map((i) => i.field));
    const firstAvailable = allFields.find((f) => !usedFields.has(f.value));
    if (!firstAvailable) return; // no more fields to add

    const newItem: RuleItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
      field: firstAvailable.value,
      rule: "required",
    };
    updateParent([...items, newItem]);
  };

  const removeItem = (id: string) => {
    updateParent(items.filter((item) => item.id !== id));
  };

  const updateField = (id: string, newField: IdentifierField) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, field: newField } : item,
    );
    updateParent(newItems);
  };

  const updateRule = (id: string, newRule: IdentifierRule) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, rule: newRule } : item,
    );
    updateParent(newItems);
  };

  // Determine which fields are available for selection (not used in other rows)
  const getAvailableFields = (currentField: IdentifierField) => {
    const usedFields = new Set(items.map((i) => i.field));
    return allFields.filter(
      (f) => !usedFields.has(f.value) || f.value === currentField,
    );
  };

  if (vertical) {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((item) => {
          const available = getAvailableFields(item.field);
          return (
            <div key={item.id} className="flex items-center gap-2">
              <select
                value={item.field}
                onChange={(e) =>
                  updateField(item.id, e.target.value as IdentifierField)
                }
                className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
              >
                {available.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={item.rule}
                onChange={(e) =>
                  updateRule(item.id, e.target.value as IdentifierRule)
                }
                className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
              >
                {ruleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                aria-label="Remove filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        <button
          onClick={addItem}
          disabled={items.length === allFields.length}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add identifier filter
        </button>
      </div>
    );
  }

  // Horizontal layout (desktop) – each row as a flex group, plus button inline
  return (
    <div
      className={`flex flex-wrap justify-end items-center gap-3 ${className}`}
    >
      {items.map((item) => {
        const available = getAvailableFields(item.field);
        return (
          <div
            key={item.id}
            className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1"
          >
            <select
              value={item.field}
              onChange={(e) =>
                updateField(item.id, e.target.value as IdentifierField)
              }
              className="text-sm rounded bg-transparent border-none focus:ring-0 dark:text-gray-200"
            >
              {available.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <span className="text-gray-400">:</span>
            <select
              value={item.rule}
              onChange={(e) =>
                updateRule(item.id, e.target.value as IdentifierRule)
              }
              className="text-sm rounded bg-transparent border-none focus:ring-0 dark:text-gray-200"
            >
              {ruleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeItem(item.id)}
              className="ml-1 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Remove filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
      {items.length < allFields.length && (
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add identifier filter
        </button>
      )}
    </div>
  );
}
