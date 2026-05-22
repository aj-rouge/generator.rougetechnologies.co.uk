// components/filters/CountFilters.tsx
"use client";

import { CountFiltersType } from "../../utils/d1/getRecentProducts";


interface CountFiltersProps {
  value: CountFiltersType;
  onChange: (filters: CountFiltersType) => void;
  vertical?: boolean;
}

const fields: { key: keyof CountFiltersType; label: string }[] = [
  { key: "image_count", label: "Images" },
  { key: "specs_count", label: "Specifications" },
  { key: "paragraphs_count", label: "Paragraphs" },
  { key: "features_count", label: "Features" },
  { key: "feedbacks_count", label: "Feedbacks" },
];

export function CountFilters({
  value,
  onChange,
  vertical = false,
}: CountFiltersProps) {
  const updateFilter = (
    field: keyof CountFiltersType,
    type: "min" | "max",
    val: number | undefined,
  ) => {
    const newFilters = { ...value };
    if (!newFilters[field]) newFilters[field] = {};
    if (val === undefined || isNaN(val)) {
      delete newFilters[field]![type];
      if (Object.keys(newFilters[field]!).length === 0)
        delete newFilters[field];
    } else {
      newFilters[field]![type] = val;
    }
    onChange(newFilters);
  };

  if (vertical) {
    return (
      <div className="space-y-4">
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={value[key]?.min ?? ""}
                onChange={(e) =>
                  updateFilter(
                    key,
                    "min",
                    e.target.value === ""
                      ? undefined
                      : parseInt(e.target.value, 10),
                  )
                }
                className="w-24 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
              />
              <input
                type="number"
                placeholder="Max"
                value={value[key]?.max ?? ""}
                onChange={(e) =>
                  updateFilter(
                    key,
                    "max",
                    e.target.value === ""
                      ? undefined
                      : parseInt(e.target.value, 10),
                  )
                }
                className="w-24 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal layout for desktop
  return (
    <div className="flex flex-wrap gap-4 items-end">
      {fields.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {label}
          </span>
          <div className="flex gap-1">
            <input
              type="number"
              placeholder="Min"
              value={value[key]?.min ?? ""}
              onChange={(e) =>
                updateFilter(
                  key,
                  "min",
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
                )
              }
              className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            />
            <span className="text-gray-500">–</span>
            <input
              type="number"
              placeholder="Max"
              value={value[key]?.max ?? ""}
              onChange={(e) =>
                updateFilter(
                  key,
                  "max",
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
                )
              }
              className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
