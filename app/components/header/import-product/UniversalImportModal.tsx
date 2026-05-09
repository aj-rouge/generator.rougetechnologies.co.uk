// app/components/import-product/UniversalImportModal.tsx
import { useState } from "react";
import { X, Globe } from "lucide-react";
import { FieldSelectionTable } from "./FieldSelectionTable";
import { IdentifierForm } from "./IdentifierForm";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
export const IMPORT_FIELDS = [
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "description", label: "Description" },
  { key: "images", label: "Images" },
  { key: "brand", label: "Brand" },
  { key: "specifications", label: "Specifications" },
];

// ----------------------------------------------------------------------------
// Hook: useUniversalImport
// ----------------------------------------------------------------------------
interface ScrapedSource {
  source: string; // e.g., "ebay", "amazon", "currys"
  identifier: string;
  product: Record<string, any>;
  specifications?: any[];
}

function useUniversalImport() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [scrapedSources, setScrapedSources] = useState<ScrapedSource[]>([]);
  const [fieldSelections, setFieldSelections] = useState<
    Record<string, number | null>
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
      // All fields start as skipped (null)
      const initialSelections: Record<string, number | null> = {};
      for (const field of IMPORT_FIELDS) {
        initialSelections[field.key] = null;
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
      if (sourceIdx === null || sourceIdx === undefined) continue; // skip this field
      const source = scrapedSources[sourceIdx];
      if (!source) continue;
      let value = null;
      if (fieldKey === "specifications") value = source.specifications;
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
    await fetchProducts(identifiers);
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
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Import Selected Fields
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
