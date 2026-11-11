// app/components/forms/sections/LogisticsSection.jsx
"use client";

import React from "react";
import { ValidationWrapper } from "./ValidationWrapper";
import ShippingMethodInput from "./ShippingMethodInput";
import LocationCombobox from "../LocationCombobox";

export interface Threshold {
  location: string;
  number: number | "";
}

export interface LogisticsUpdatePayload {
  weight?: number | "";
  quantity?: number | "";
  shipping_method?: string;
  thresholds?: Threshold[];
}

interface LogisticsSectionProps {
  weight?: number | "";
  quantity?: number | "";
  shipping_method?: string;
  thresholds?: Threshold[];
  onUpdate: (payload: LogisticsUpdatePayload) => void;
  // ⚠️ FEATURE DISABLED: prop kept in the interface so callers still type-check.
  // Component currently ignores this value. To re-enable, see the
  // "⚠️ FEATURE DISABLED" comments throughout this file.
  disabled?: boolean;
}

export default function LogisticsSection({
  weight = "",
  quantity = 0,
  shipping_method = "",
  thresholds = [],
  onUpdate,
  // disabled = false, // ⚠️ FEATURE DISABLED — uncomment to re-enable
}: LogisticsSectionProps) {
  const isFilled = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return !isNaN(value);
    return true;
  };

  const fields = [weight, quantity, shipping_method];
  const filledCount = fields.filter(isFilled).length;
  const total = fields.length;
  const validationScore = (filledCount / total) * 100;

  const handleNumericChange = (
    field: "weight",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // if (disabled) return; // ⚠️ FEATURE DISABLED — uncomment to re-enable
    const raw = e.target.value;
    if (raw === "") return onUpdate({ [field]: undefined });
    const num = parseFloat(raw);
    onUpdate({ [field]: isNaN(num) ? undefined : num });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // if (disabled) return; // ⚠️ FEATURE DISABLED — uncomment to re-enable
    const raw = e.target.value;
    if (raw === "") return onUpdate({ quantity: undefined });
    const intVal = parseInt(raw, 10);
    onUpdate({ quantity: isNaN(intVal) ? undefined : intVal });
  };

  const handleThresholdChange = (
    index: number,
    field: keyof Threshold,
    value: string,
  ) => {
    // if (disabled) return; // ⚠️ FEATURE DISABLED — uncomment to re-enable
    const updated = thresholds.map((t, i) => {
      if (i !== index) return t;
      if (field === "number") {
        if (value === "") return { ...t, number: "" as const };
        const num = parseInt(value, 10);
        return { ...t, number: isNaN(num) ? ("" as const) : num };
      }
      return { ...t, location: value };
    });
    onUpdate({ thresholds: updated });
  };

  const addThreshold = () => {
    // if (disabled) return; // ⚠️ FEATURE DISABLED — uncomment to re-enable
    onUpdate({ thresholds: [...thresholds, { location: "", number: "" }] });
  };

  const removeThreshold = (index: number) => {
    // if (disabled) return; // ⚠️ FEATURE DISABLED — uncomment to re-enable
    onUpdate({ thresholds: thresholds.filter((_, i) => i !== index) });
  };

  return (
    <ValidationWrapper validationScore={validationScore}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className={`block text-black dark:text-gray-100 font-medium ${
              // ⚠️ FEATURE DISABLED — re-enable by uncommenting the line
              // below and removing the `""` placeholder.
              // disabled ? "opacity-50" : ""
              ""
            }`}
          >
            Logistics
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filledCount}/{total} filled
          </span>
        </div>
        <div className="space-y-3">
          {/* Weight */}
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={weight === "" ? "" : weight}
              onChange={(e) => handleNumericChange("weight", e)}
              placeholder="0.00"
              /* disabled={disabled} */ /* ⚠️ FEATURE DISABLED */
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Shipping weight in kilograms
            </p>
          </div>

          {/* Thresholds (left) | Stock Quantity (right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Thresholds */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-600 dark:text-gray-400 block">
                  Thresholds
                </label>
                <button
                  type="button"
                  onClick={addThreshold}
                  /* disabled={disabled} */ /* ⚠️ FEATURE DISABLED */
                  className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add
                </button>
              </div>

              {thresholds.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1">
                  No thresholds yet — click + Add.
                </p>
              ) : (
                <div className="space-y-2">
                  {thresholds.map((t, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <span
                        className="text-[10px] text-amber-500 w-4 shrink-0 text-center"
                        title={index === 0 ? "Primary threshold" : ""}
                      >
                        {index === 0 ? "★" : index + 1}
                      </span>
                      <LocationCombobox
                        value={t.location}
                        onChange={(v) =>
                          handleThresholdChange(index, "location", v)
                        }
                        /* disabled={disabled} */ /* ⚠️ FEATURE DISABLED */
                        placeholder="Location ID"
                      />
                      <input
                        type="number"
                        value={t.number === "" ? "" : t.number}
                        onChange={(e) =>
                          handleThresholdChange(index, "number", e.target.value)
                        }
                        placeholder="0"
                        min="0"
                        /* disabled={disabled} */ /* ⚠️ FEATURE DISABLED */
                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => removeThreshold(index)}
                        /* disabled={disabled} */ /* ⚠️ FEATURE DISABLED */
                        className="text-xs px-1.5 py-0.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove threshold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                First entry (★) is the primary threshold.
              </p>
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                Stock Quantity
              </label>
              <input
                type="number"
                value={quantity === "" ? "" : quantity}
                onChange={handleQuantityChange}
                placeholder="0"
                /* disabled={disabled} */ /* ⚠️ FEATURE DISABLED */
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Available stock count
              </p>
            </div>
          </div>

          {/* Shipping Method — now template-driven */}
          <ShippingMethodInput
            value={shipping_method || ""}
            onChange={(v) => onUpdate({ shipping_method: v })}
            /* disabled={disabled} */ /* ⚠️ FEATURE DISABLED */
          />
        </div>
      </div>
    </ValidationWrapper>
  );
}
