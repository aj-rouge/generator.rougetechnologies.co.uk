// UniversalImportModal.tsx - Merged component + hook
import { useState } from "react";
import { X, Globe } from "lucide-react";
import { FieldSelectionTable } from "../../FieldSelectionTable";
import { IdentifierForm } from "../../IdentifierForm";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
export const IMPORT_FIELDS = [
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "description", label: "Description" },
  { key: "images", label: "Images" },
  { key: "condition", label: "Condition" },
  { key: "brand", label: "Brand" },
  { key: "mpn", label: "MPN" },
  { key: "sku", label: "SKU" },
  { key: "specifications", label: "Specifications" },
  { key: "shipping", label: "Shipping Info" },
  { key: "returns", label: "Returns" },
];

// ----------------------------------------------------------------------------
// Hook: useUniversalImport
// ----------------------------------------------------------------------------
interface ScrapedSource {
  source: string; // e.g., "ebay", "amazon", "currys"
  identifier: string;
  product: Record<string, any>;
  specifications?: any[];
  shipping?: any;
  returns?: any;
}

function useUniversalImport() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [scrapedSources, setScrapedSources] = useState<ScrapedSource[]>([]);
  const [fieldSelections, setFieldSelections] = useState<
    Record<string, number>
  >({});
  const [errorMessage, setErrorMessage] = useState("");

  const reset = () => {
    setStatus("idle");
    setScrapedSources([]);
    setFieldSelections({});
    setErrorMessage("");
  };

  const fetchProducts = async (identifiers: string[]) => {
    if (identifiers.length === 0) {
      setErrorMessage(
        "Please enter at least one identifier (EAN, ASIN, eBay URL, Amazon URL, or Currys URL)",
      );
      return false;
    }
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await fetch("/api/scrape/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      if (result.data.length === 0) {
        setErrorMessage("No valid product data found for any identifier");
        setStatus("error");
        return false;
      }
      setScrapedSources(result.data);
      // Auto-select first source that provides a value for each field
      const initialSelections: Record<string, number> = {};
      for (const field of IMPORT_FIELDS) {
        const availableIndex = result.data.findIndex((src: ScrapedSource) => {
          if (field.key === "specifications")
            return src.specifications?.length > 0;
          if (field.key === "shipping") return src.shipping;
          if (field.key === "returns") return src.returns;
          return src.product[field.key] && src.product[field.key] !== "";
        });
        if (availableIndex !== -1)
          initialSelections[field.key] = availableIndex;
      }
      setFieldSelections(initialSelections);
      setStatus("success");
      return true;
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message);
      return false;
    }
  };

  const buildImportData = () => {
    const finalData: Record<string, any> = {};
    for (const [fieldKey, sourceIdx] of Object.entries(fieldSelections)) {
      const source = scrapedSources[sourceIdx];
      if (!source) continue;
      let value = null;
      if (fieldKey === "specifications") value = source.specifications;
      else if (fieldKey === "shipping") value = source.shipping;
      else if (fieldKey === "returns") value = source.returns;
      else if (fieldKey === "images") value = source.product.images;
      else value = source.product[fieldKey];
      if (value !== null && value !== undefined && value !== "") {
        finalData[fieldKey] = value;
      }
    }
    return finalData;
  };

  return {
    status,
    scrapedSources,
    fieldSelections,
    errorMessage,
    setFieldSelections,
    fetchProducts,
    buildImportData,
    reset,
  };
}

// ----------------------------------------------------------------------------
// Modal Component
// ----------------------------------------------------------------------------
interface UniversalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Record<string, any>) => void;
}

export default function UniversalImportModal({
  isOpen,
  onClose,
  onImport,
}: UniversalImportModalProps) {
  const {
    status,
    scrapedSources,
    fieldSelections,
    errorMessage,
    setFieldSelections,
    fetchProducts,
    buildImportData,
    reset,
  } = useUniversalImport();

  if (!isOpen) return null;

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  const handleFetch = async (identifiers: string[]) => {
    const success = await fetchProducts(identifiers);
    if (!success && status === "error") {
      // Error already handled in hook
    }
  };

  const handleImport = () => {
    const importData = buildImportData();
    onImport(importData);
    onClose();
    reset();
  };

  const handleBack = () => {
    reset();
  };

  const allFieldsSelected = () => {
    // Only fields that appear in at least one source need a selection
    const availableFields = IMPORT_FIELDS.filter((field) =>
      scrapedSources.some((src) => {
        if (field.key === "specifications")
          return src.specifications?.length > 0;
        if (field.key === "shipping") return src.shipping;
        if (field.key === "returns") return src.returns;
        return src.product[field.key] && src.product[field.key] !== "";
      }),
    );
    return availableFields.every(
      (field) => fieldSelections[field.key] !== undefined,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-500">
            <Globe className="w-5 h-5" />
            <h3 className="text-lg font-bold">Universal Product Import</h3>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isSuccess ? (
            <IdentifierForm
              onSubmit={handleFetch}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onCancel={onClose}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="font-medium mb-2">Sources found:</div>
                <div className="flex flex-wrap gap-2">
                  {scrapedSources.map((src, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs capitalize"
                    >
                      #{idx + 1}: {src.source}
                    </span>
                  ))}
                </div>
              </div>
              <FieldSelectionTable
                sources={scrapedSources}
                fieldSelections={fieldSelections}
                onFieldSelectionChange={(fieldKey, sourceIndex) =>
                  setFieldSelections((prev) => ({
                    ...prev,
                    [fieldKey]: sourceIndex,
                  }))
                }
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!allFieldsSelected()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium"
                >
                  Import Selected Fields
                </button>
              </div>
              {!allFieldsSelected() && (
                <p className="text-xs text-amber-600">
                  Please select a source for each available field
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
