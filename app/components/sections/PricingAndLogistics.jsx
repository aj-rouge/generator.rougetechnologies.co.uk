// app/components/forms/sections/PricingAndLogistics.jsx
"use client";

const MAX_VAT_RATE = 30; // Configurable cap for VAT/tax rate (%)

export default function PricingAndLogistics({
  vat_rate = 0,
  price_brutto = "",
  rrp = "",
  weight = "",
  quantity = 0,
  shipping_method = "",
  onUpdate,
}) {
  // Helper to check if a field has a value (non-empty after trimming, or non-zero for numbers)
  const isFilled = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return !isNaN(value);
    return true;
  };

  // Pricing card fields (VAT rate always selected, price_brutto, rrp)
  const pricingFields = [vat_rate, price_brutto, rrp];
  const pricingFilledCount = pricingFields.filter(isFilled).length;
  const pricingTotal = pricingFields.length;

  // Logistics card fields (weight, quantity, shipping_method)
  const logisticsFields = [weight, quantity, shipping_method];
  const logisticsFilledCount = logisticsFields.filter(isFilled).length;
  const logisticsTotal = logisticsFields.length;

  // Determine border color based on fill level
  const getBorderColor = (filled, total) => {
    if (filled === 0) return "border-red-300 dark:border-red-600";
    if (filled === total) return "border-green-300 dark:border-green-600";
    return "border-yellow-300 dark:border-yellow-600";
  };

  const pricingBorder = getBorderColor(pricingFilledCount, pricingTotal);
  const logisticsBorder = getBorderColor(logisticsFilledCount, logisticsTotal);

  const handleInputChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  // VAT-specific change handler with capping
  const handleVatChange = (e) => {
    let raw = e.target.value;
    let num = raw === "" ? 0 : parseFloat(raw);
    if (isNaN(num)) num = 0;
    const capped = Math.min(MAX_VAT_RATE, Math.max(0, num));
    handleInputChange("vat_rate", capped);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {/* Pricing Card */}
      <div
        className={`bg-white dark:bg-gray-800 p-4 rounded-lg border-2 ${pricingBorder}`}
      >
        <div className="flex items-center justify-between mb-4">
          <label className="block text-black dark:text-gray-100 font-medium">
            Pricing
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {pricingFilledCount}/{pricingTotal} filled
          </span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              VAT Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max={MAX_VAT_RATE}
              value={vat_rate}
              onChange={handleVatChange}
              onBlur={handleVatChange} // Ensure capping on blur as well
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tax rate between 0% and {MAX_VAT_RATE}% (e.g., 20 for standard UK
              VAT)
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Price (Gross, £)
            </label>
            <input
              type="number"
              step="0.01"
              value={price_brutto}
              onChange={(e) =>
                handleInputChange(
                  "price_brutto",
                  e.target.value === "" ? 0 : parseFloat(e.target.value),
                )
              }
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gross selling price including VAT
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              RRP (£)
            </label>
            <input
              type="number"
              step="0.01"
              value={rrp}
              onChange={(e) =>
                handleInputChange(
                  "rrp",
                  e.target.value === "" ? 0 : parseFloat(e.target.value),
                )
              }
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Recommended retail price (optional)
            </p>
          </div>
        </div>
      </div>

      {/* Logistics Card */}
      <div
        className={`bg-white dark:bg-gray-800 p-4 rounded-lg border-2 ${logisticsBorder}`}
      >
        <div className="flex items-center justify-between mb-4">
          <label className="block text-black dark:text-gray-100 font-medium">
            Logistics
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {logisticsFilledCount}/{logisticsTotal} filled
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
              value={weight}
              onChange={(e) =>
                handleInputChange(
                  "weight",
                  e.target.value === "" ? 0 : parseFloat(e.target.value),
                )
              }
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
              value={quantity}
              onChange={(e) =>
                handleInputChange("quantity", parseInt(e.target.value) || 0)
              }
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
            <input
              type="text"
              value={shipping_method}
              onChange={(e) =>
                handleInputChange("shipping_method", e.target.value)
              }
              placeholder="e.g. Royal Mail 48"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Carrier and service level
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
