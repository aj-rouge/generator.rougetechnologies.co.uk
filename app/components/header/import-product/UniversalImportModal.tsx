// app/components/import-product/UniversalImportModal.tsx
import { useEffect, useState } from "react";
import { X, Globe, Loader2, Sparkles } from "lucide-react";
import { FieldSelectionTable } from "./FieldSelectionTable";
import { IdentifierForm } from "./IdentifierForm";
import { useNotification } from "../../../context/NotificationContext";

// ----------------------------------------------------------------------------
// Constants & Interfaces
// ----------------------------------------------------------------------------
export const IMPORT_FIELDS = [
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "description", label: "Description" },
  { key: "images", label: "Images" },
  { key: "brand", label: "Brand" },
  { key: "specifications", label: "Specifications" },
];

interface GenerateApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

interface ScrapedSource {
  source: string; // e.g., "ebay", "amazon", "currys"
  identifier: string;
  product: Record<string, any>;
  specifications?: any[];
}

// API response types
interface ScrapeBatchResponse {
  success: boolean;
  data: ScrapedSource[];
  error?: string;
}

interface SkuGenerationResponse {
  sku?: string;
}

interface ParagraphsGenerationResponse {
  paragraphs?: string[];
}

interface FeatureItem {
  title: string;
  description: string;
}

interface FeaturesGenerationResponse {
  features?: FeatureItem[];
}

interface TitleGenerationResponse {
  title: string; // AI‑optimised title
}

// ----------------------------------------------------------------------------
// Hook: useUniversalImport
// ----------------------------------------------------------------------------
function useUniversalImport() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [scrapedSources, setScrapedSources] = useState<ScrapedSource[]>([]);
  const [fieldSelections, setFieldSelections] = useState<Record<string, any>>(
    {},
  );
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

      const result = (await response.json()) as ScrapeBatchResponse;
      if (!result.success) throw new Error(result.error);
      if (result.data.length === 0) {
        setErrorMessage("No valid product data found for any identifier");
        setStatus("error");
        return false;
      }
      setScrapedSources(result.data);

      // All fields start as skipped (null for regular fields, object for images)
      const initialSelections: Record<string, any> = {};
      for (const field of IMPORT_FIELDS) {
        if (field.key === "images") {
          initialSelections[field.key] = {
            sourceIndex: null,
            selectedUrls: [],
          };
        } else {
          initialSelections[field.key] = null;
        }
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
    for (const [fieldKey, selection] of Object.entries(fieldSelections)) {
      if (fieldKey === "images") {
        const { sourceIndex, selectedUrls } = selection as {
          sourceIndex: number | null;
          selectedUrls: string[];
        };
        if (sourceIndex !== null && selectedUrls.length > 0) {
          finalData.images = selectedUrls.slice(0, 16);
        }
        continue;
      }
      const sourceIdx = selection as number | null;
      if (sourceIdx === null || sourceIdx === undefined) continue;
      const source = scrapedSources[sourceIdx];
      if (!source) continue;
      let value = null;
      if (fieldKey === "specifications") value = source.specifications;
      else if (fieldKey === "brand") value = source.product.brand;
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
  categoryName?: string;
  condition?: string;
  categoryKeywords?: string[];
}

export default function UniversalImportModal({
  isOpen,
  onClose,
  onImport,
  categoryName = "",
  condition = "",
  categoryKeywords = [],
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

  const { addNotification } = useNotification();
  const [aiLoading, setAiLoading] = useState(false);

  const getSelectedFieldValue = (fieldKey: string) => {
    const selection = fieldSelections[fieldKey];
    if (fieldKey === "images") {
      const { sourceIndex, selectedUrls } = selection as {
        sourceIndex: number | null;
        selectedUrls: string[];
      };
      if (sourceIndex === null) return null;
      const source = scrapedSources[sourceIndex];
      return (
        source?.product?.images?.filter((url: string) =>
          selectedUrls.includes(url),
        ) || []
      );
    }
    const sourceIdx = selection as number | null;
    if (sourceIdx === null || sourceIdx === undefined) return null;
    const source = scrapedSources[sourceIdx];
    if (!source) return null;
    switch (fieldKey) {
      case "title":
        return source.product?.title || null;
      case "price":
        return source.product?.price || null;
      case "description":
        return source.product?.description || null;
      case "brand":
        return source.product?.brand || null;
      case "specifications":
        return source.specifications || null;
      default:
        return null;
    }
  };

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

  const selectedTitle = getSelectedFieldValue("title");
  const selectedBrand = getSelectedFieldValue("brand");
  const selectedSpecs = getSelectedFieldValue("specifications") || [];
  const canAiAutofill = !!selectedTitle && !!categoryName && !aiLoading;

  const handleAiAutofill = async () => {
    if (!selectedTitle) {
      addNotification({
        message: "Select a title source first",
        type: "warning",
      });
      return;
    }
    if (!categoryName) {
      addNotification({
        message: "Select a product category first",
        type: "warning",
      });
      return;
    }
    setAiLoading(true);
    try {
      // 1. Generate SKU
      const skuRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "sku",
          title: selectedTitle,
          condition: condition || "New",
        }),
      });
      const skuData = (await skuRes.json()) as GenerateApiResponse<{
        sku: string;
      }>;
      if (!skuData.success) throw new Error(skuData.error);
      const sku = skuData.data.sku;

      // 2. Generate paragraphs
      const paraRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "paragraphs",
          title: selectedTitle,
          category: categoryName,
          specifications: selectedSpecs,
          features: [],
          keywords: categoryKeywords,
        }),
      });
      const paraData = (await paraRes.json()) as GenerateApiResponse<{
        paragraphs: string[];
      }>;
      if (!paraData.success) throw new Error(paraData.error);
      const paragraphs = paraData.data.paragraphs;

      // 3. Generate features
      const featRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "features",
          title: selectedTitle,
          category: categoryName,
          specifications: selectedSpecs,
          keywords: categoryKeywords,
        }),
      });
      const featData = (await featRes.json()) as GenerateApiResponse<{
        features: FeatureItem[];
      }>;
      if (!featData.success) throw new Error(featData.error);
      const features = featData.data.features;

      // 4. Generate optimised title
      const titleRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "title",
          originalTitle: selectedTitle,
          categoryName,
          categoryKeywords,
          specifications: selectedSpecs,
          brand: selectedBrand,
        }),
      });
      const titleData = (await titleRes.json()) as GenerateApiResponse<{
        title: string;
      }>;
      if (!titleData.success) throw new Error(titleData.error);
      const generatedTitle = titleData.data.title;

      // Build final import data (same as before)
      const finalData: any = {};
      if (sku) finalData.sku = sku;
      if (paragraphs) finalData.paragraphs = paragraphs;
      if (features)
        finalData.features = features.map((f: FeatureItem) => ({
          title: f.title,
          description: f.description,
        }));
      finalData.title = generatedTitle || selectedTitle;
      const selectedPrice = getSelectedFieldValue("price");
      if (selectedPrice) finalData.price = selectedPrice;

      const selectedImages = getSelectedFieldValue("images");
      if (selectedImages) finalData.images = selectedImages.slice(0, 16);

      const selectedBrandVal = getSelectedFieldValue("brand");
      if (selectedBrandVal) finalData.brand = selectedBrandVal;

      if (selectedSpecs.length) finalData.specifications = selectedSpecs;

      onImport(finalData);
      onClose();
      reset();
      addNotification({ message: "AI Autofill complete!", type: "success" });
    } catch (error: any) {
      addNotification({
        message: `AI Autofill failed: ${error.message}`,
        type: "error",
      });
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen) return null;

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
                setFieldSelections={setFieldSelections}
                addNotification={addNotification}
              />
              <div className="flex sm:flex-row flex-col-reverse justify-end gap-3 pt-2">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleAiAutofill}
                  disabled={!canAiAutofill}
                  className={`px-4 py-2 rounded-lg justify-center font-medium flex items-center gap-2 transition-colors ${
                    canAiAutofill
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-purple-300 cursor-not-allowed text-white"
                  }`}
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {aiLoading ? "Autofilling..." : "AI Autofill"}
                </button>
                <button
                  onClick={handleImport}
                  disabled={
                    !Object.values(fieldSelections).some((s) => {
                      if (typeof s === "object" && s !== null)
                        return (
                          s.sourceIndex !== null && s.selectedUrls.length > 0
                        );
                      return s !== null;
                    })
                  }
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
