"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import { CountFiltersType } from "../../utils/d1/getRecentProducts";

interface CountFiltersProps {
  value: CountFiltersType;
  onChange: (filters: CountFiltersType) => void;
  vertical?: boolean;
}

const allFields: { key: keyof CountFiltersType; label: string }[] = [
  { key: "image_count", label: "Images" },
  { key: "specs_count", label: "Specifications" },
  { key: "paragraphs_count", label: "Paragraphs" },
  { key: "features_count", label: "Features" },
  { key: "feedbacks_count", label: "Feedbacks" },
];

type FilterItem = {
  id: string;
  field: keyof CountFiltersType;
  min: number | undefined;
  max: number | undefined;
};

// Helper to compare two filter objects for equality (ignores IDs)
function areFiltersEqual(a: FilterItem[], b: FilterItem[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.field.localeCompare(y.field));
  const sortedB = [...b].sort((x, y) => x.field.localeCompare(y.field));
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i].field !== sortedB[i].field) return false;
    if (sortedA[i].min !== sortedB[i].min) return false;
    if (sortedA[i].max !== sortedB[i].max) return false;
  }
  return true;
}

export function CountFilters({
  value,
  onChange,
  vertical = false,
}: CountFiltersProps) {
  const [items, setItems] = useState<FilterItem[]>(() => {
    const initialItems: FilterItem[] = [];
    for (const field of allFields.map((f) => f.key)) {
      const filter = value[field];
      if (filter && (filter.min !== undefined || filter.max !== undefined)) {
        initialItems.push({
          id: Math.random().toString(36) + Date.now(),
          field,
          min: filter.min,
          max: filter.max,
        });
      }
    }
    return initialItems;
  });

  const isInternalUpdate = useRef(false);

  // Sync external value changes (e.g., "Clear all filters") without wiping internal updates
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const newItems: FilterItem[] = [];
    for (const field of allFields.map((f) => f.key)) {
      const filter = value[field];
      if (filter && (filter.min !== undefined || filter.max !== undefined)) {
        newItems.push({
          id: Math.random().toString(36) + Date.now(),
          field,
          min: filter.min,
          max: filter.max,
        });
      }
    }

    if (!areFiltersEqual(items, newItems)) {
      setItems(newItems);
    }
  }, [value, items]);

  const updateParent = (newItems: FilterItem[]) => {
    isInternalUpdate.current = true;
    const newValue: CountFiltersType = {};
    for (const item of newItems) {
      if (item.min !== undefined || item.max !== undefined) {
        newValue[item.field] = {};
        if (item.min !== undefined) newValue[item.field]!.min = item.min;
        if (item.max !== undefined) newValue[item.field]!.max = item.max;
      }
    }
    onChange(newValue);
    setItems(newItems);
  };

  const addItem = () => {
    const usedFields = new Set(items.map((i) => i.field));
    const firstAvailable = allFields.find((f) => !usedFields.has(f.key));
    if (!firstAvailable) return;

    const newItem: FilterItem = {
      id: Math.random().toString(36) + Date.now(),
      field: firstAvailable.key,
      min: undefined,
      max: undefined,
    };
    updateParent([...items, newItem]);
  };

  const removeItem = (id: string) => {
    updateParent(items.filter((item) => item.id !== id));
  };

  const updateField = (id: string, newField: keyof CountFiltersType) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, field: newField } : item,
    );
    updateParent(newItems);
  };

  const updateMin = (id: string, val: number | undefined) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, min: val } : item,
    );
    updateParent(newItems);
  };

  const updateMax = (id: string, val: number | undefined) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, max: val } : item,
    );
    updateParent(newItems);
  };

  const getAvailableFields = (currentField: keyof CountFiltersType) => {
    const usedFields = new Set(items.map((i) => i.field));
    return allFields.filter(
      (f) => !usedFields.has(f.key) || f.key === currentField,
    );
  };

  if (vertical) {
    return (
      <div className="space-y-4">
        {items.map((item) => {
          const available = getAvailableFields(item.field);
          return (
            <div
              key={item.id}
              className="space-y-2 border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0"
            >
              <div className="flex items-center justify-between">
                <select
                  value={item.field}
                  onChange={(e) =>
                    updateField(
                      item.id,
                      e.target.value as keyof CountFiltersType,
                    )
                  }
                  className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                >
                  {available.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
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
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={item.min ?? ""}
                  onChange={(e) =>
                    updateMin(
                      item.id,
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                    )
                  }
                  className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={item.max ?? ""}
                  onChange={(e) =>
                    updateMax(
                      item.id,
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                    )
                  }
                  className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
            </div>
          );
        })}
        {items.length < allFields.length && (
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add count filter
          </button>
        )}
      </div>
    );
  }

  // Horizontal layout (desktop)
  return (
    <div className="flex justify-end flex-wrap items-center gap-3">
      {items.map((item) => {
        const available = getAvailableFields(item.field);
        return (
          <div
            key={item.id}
            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1"
          >
            <select
              value={item.field}
              onChange={(e) =>
                updateField(item.id, e.target.value as keyof CountFiltersType)
              }
              className="text-sm rounded bg-transparent border-none focus:ring-0 dark:text-gray-200"
            >
              {available.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Min"
              value={item.min ?? ""}
              onChange={(e) =>
                updateMin(
                  item.id,
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
                )
              }
              className="w-20 px-1 py-0.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            />
            <span className="text-gray-500">–</span>
            <input
              type="number"
              placeholder="Max"
              value={item.max ?? ""}
              onChange={(e) =>
                updateMax(
                  item.id,
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
                )
              }
              className="w-20 px-1 py-0.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            />
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
          Add count filter
        </button>
      )}
    </div>
  );
}
