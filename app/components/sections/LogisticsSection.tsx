// app/components/forms/sections/LogisticsSection.jsx
"use client";

import React from "react";
import { ValidationWrapper } from "./ValidationWrapper";

export interface LogisticsUpdatePayload {
  weight?: number;
  quantity?: number;
  shipping_method?: string;
}

interface LogisticsSectionProps {
  weight?: number | "";
  quantity?: number | "";
  shipping_method?: string;
  onUpdate: (payload: LogisticsUpdatePayload) => void;
  disabled?: boolean;
}

export default function LogisticsSection({
  weight = "",
  quantity = 0,
  shipping_method = "",
  onUpdate,
  disabled = false,
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
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (disabled) return;
    const raw = e.target.value;
    if (raw === "") {
      onUpdate({ [field]: undefined });
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) {
      onUpdate({ [field]: undefined });
      return;
    }
    onUpdate({ [field]: num });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    if (raw === "") {
      onUpdate({ quantity: undefined });
      return;
    }
    const intVal = parseInt(raw, 10);
    if (isNaN(intVal)) {
      onUpdate({ quantity: undefined });
      return;
    }
    onUpdate({ quantity: intVal });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ shipping_method: e.target.value });
  };

  return (
    <ValidationWrapper validationScore={validationScore}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className={`block text-black dark:text-gray-100 font-medium ${disabled ? "opacity-50" : ""}`}
          >
            Logistics
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filledCount}/{total} filled
          </span>
        </div>
        <div className="space-y-3">
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
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Shipping weight in kilograms
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Stock Quantity
            </label>
            <input
              type="number"
              value={quantity === "" ? "" : quantity}
              onChange={handleQuantityChange}
              placeholder="0"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Available stock count
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Shipping Method
            </label>
            <select
              value={shipping_method}
              onChange={handleSelectChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">-- Select a shipping method --</option>
              <option value="RM Tracked 48 (Letters)">RM Tracked 48 (Letters)</option>
              <option value="RM Tracked 48 (Parcels)">RM Tracked 48 (Parcels)</option>
              <option value="RM Tracked 24 (Letters)">RM Tracked 24 (Letters)</option>
              <option value="RM Tracked 24 (Parcels)">RM Tracked 24 (Parcels)</option>
              <option value="RM Special Delivery">RM Special Delivery</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Carrier and service level
            </p>
          </div>
        </div>
      </div>
    </ValidationWrapper>
  );
}