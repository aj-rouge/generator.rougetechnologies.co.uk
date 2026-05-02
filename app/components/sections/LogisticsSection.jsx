// app/components/forms/sections/LogisticsSection.jsx
"use client";

export default function LogisticsSection({
  weight = "",
  quantity = 0,
  shipping_method = "",
  onUpdate,
}) {
  const isFilled = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return !isNaN(value);
    return true;
  };

  const fields = [weight, quantity, shipping_method];
  const filledCount = fields.filter(isFilled).length;
  const total = fields.length;

  const getBorderColor = (filled, total) => {
    if (filled === 0) return "border-red-300 dark:border-red-600";
    if (filled === total) return "border-green-300 dark:border-green-600";
    return "border-yellow-300 dark:border-yellow-600";
  };

  const handleNumericChange = (field, e) => {
    const raw = e.target.value;
    if (raw === "") {
      onUpdate({ [field]: "" });
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num)) {
      onUpdate({ [field]: "" });
      return;
    }
    onUpdate({ [field]: num });
  };

  const handleQuantityChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      onUpdate({ quantity: "" });
      return;
    }
    const intVal = parseInt(raw, 10);
    if (isNaN(intVal)) {
      onUpdate({ quantity: "" });
      return;
    }
    onUpdate({ quantity: intVal });
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 p-4 rounded-lg border-2 ${getBorderColor(
        filledCount,
        total,
      )}`}
    >
      <div className="flex items-center justify-between mb-4">
        <label className="block text-black dark:text-gray-100 font-medium">
          Logistics
        </label>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
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
            onChange={(e) => onUpdate({ shipping_method: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">-- Select a shipping method --</option>
            <option value="RM Tracked 48 (Letters)">
              RM Tracked 48 (Letters)
            </option>
            <option value="RM Tracked 48 (Parcels)">
              RM Tracked 48 (Parcels)
            </option>
            <option value="RM Tracked 24 (Letters)">
              RM Tracked 24 (Letters)
            </option>
            <option value="RM Tracked 24 (Parcels)">
              RM Tracked 24 (Parcels)
            </option>
            <option value="RM Special Delivery">RM Special Delivery</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Carrier and service level
          </p>
        </div>
      </div>
    </div>
  );
}
