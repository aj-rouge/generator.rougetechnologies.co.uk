// app/components/forms/ProductForm.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import GenerateHTML from "./sections/GenerateHTML";
import LivePreview from "./preview/LivePreview";
import TitleInput from "./sections/TitleInput";
import ConditionSelector, {
  findCategoryBySlug,
} from "./sections/ConditionSelector";
import ParagraphsManager from "./sections/ParagraphsManager";
import FeaturesManager from "./sections/FeaturesManager";
import NoteInput from "./sections/NoteInput";
import ImagesManager from "./sections/image-section/ImagesManager";
import FeedbackManager from "./sections/FeedbackManager";
import CategorySelector from "./sections/CategorySelector";
import { DEFAULT_FEEDBACKS } from "../data/feedbacks";
import ProductFormHeader from "./header/ProductFormHeader";
import { generateSeoSlug } from "../utils/images/seoGenerator";
import SKUManager from "./sections/SKUManager";
import { useNotification } from "../context/NotificationContext";
import { useRouter } from "next/navigation";
import SpecificationsManager from "./sections/SpecificationsManager";
import LogisticsSection from "./sections/LogisticsSection";
import PricingSection from "./sections/PricingSection";
import ProductIdentifiersSection from "./sections/ProductIdentifiersSection";
import ExternalPlatformIdsSection from "./sections/ExternalPlatformIdsSection";

// ----------------------------------------------------------------------------
// Type Interfaces
// ----------------------------------------------------------------------------
interface ProductImage {
  url: string;
  s3Path: string | null;
  altText: string;
  isUploaded: boolean;
  needsUpload: boolean;
  uploadStatus: "pending" | "completed";
}

interface ProductFormState {
  id?: string;
  sku: string;
  title: string;
  condition: string;
  paragraphs: string[];
  features: { title: string; description: string }[];
  seoSectionData: { name: string; sections: any[] };
  selectedCategory: string;
  note: string | null;
  feedbacks: any;
  images: ProductImage[];
  asin: string;
  ean: string;
  baselinker_id: string;
  shopify_id: string;
  ebayLink: string;
  specifications: any[];
  vat_rate: number | "";
  rrp: number | "";
  weight: number | "";
  quantity: number | "";
  price_brutto: number | "";
  shipping_method: string;
  category?: string;
}

interface SaveProductApiResponse {
  success: boolean;
  id: string;
  error?: string;
  updatedImages?: Array<{
    url: string;
    s3Path: string | null;
    altText: string;
  }>;
}

interface ProductFormProps {
  mode?: "create" | "edit";
  categories?: any[];
  initialData?: Record<string, any> | null;
  categoryContent?: any;
}

// Helper to sanitise a value: convert empty string or placeholder strings to null
const sanitizeField = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  if (
    trimmed === "" ||
    trimmed === "null" ||
    trimmed === "NULL" ||
    trimmed === "none"
  ) {
    return null;
  }
  return value;
};

// Helper to sanitize specifically for incoming custom form numeric types (number | "")
const sanitizeNumericField = (value: any): number | "" => {
  const sanitized = sanitizeField(value);
  if (sanitized === null) return "";
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? "" : parsed;
};

const INITIAL_FORM_STATE: ProductFormState = {
  sku: "",
  title: "",
  condition: "",
  paragraphs: [],
  features: [],
  seoSectionData: { name: "", sections: [] },
  selectedCategory: "",
  note: null,
  feedbacks: DEFAULT_FEEDBACKS,
  images: [],
  asin: "",
  ean: "",
  baselinker_id: "",
  shopify_id: "",
  ebayLink: "",
  specifications: [],
  vat_rate: "",
  rrp: "",
  weight: "",
  quantity: "",
  price_brutto: "",
  shipping_method: "",
};

export default function ProductForm({
  mode = "create",
  categories = [],
  initialData = null,
  categoryContent = null,
}: ProductFormProps) {
  const router = useRouter();
  const { addNotification, updateNotification, removeNotification } =
    useNotification();

  const [formData, setFormData] = useState<ProductFormState>(() => {
    if (mode === "create") return INITIAL_FORM_STATE;
    if (initialData) {
      return {
        ...INITIAL_FORM_STATE,
        ...initialData,
        vat_rate: initialData.vat_rate ?? 0,
        rrp: sanitizeNumericField(initialData.rrp),
        weight: sanitizeNumericField(initialData.weight),
        quantity: initialData.quantity ?? 0,
        price_brutto: sanitizeNumericField(initialData.price_brutto),
        shipping_method: sanitizeField(initialData.shipping_method) ?? "",
        note: sanitizeField(initialData.note),
        asin: sanitizeField(initialData.asin) ?? "",
        ean: sanitizeField(initialData.ean) ?? "",
        baselinker_id: sanitizeField(initialData.baselinker_id) ?? "",
        shopify_id: sanitizeField(initialData.shopify_id) ?? "",
        sku: sanitizeField(initialData.sku) ?? "",
        images: (initialData.images || []).map((img: any) => ({
          url: img.url,
          s3Path: img.s3Path,
          altText: img.altText,
          isUploaded: !!img.s3Path,
          needsUpload: false,
          uploadStatus: "completed" as const,
        })),
        ebayLink: initialData.ebayLink || "",
        seoSectionData: initialData.seoSectionData || {
          name: "",
          sections: [],
        },
        specifications: initialData.specifications || [],
      };
    }
    return INITIAL_FORM_STATE;
  });

  // If initialData changes (e.g., navigation), update form
  useEffect(() => {
    if (initialData && (mode === "edit" || mode === "create")) {
      setFormData({
        ...INITIAL_FORM_STATE,
        ...initialData,
        vat_rate: initialData.vat_rate ?? 0,
        rrp: sanitizeNumericField(initialData.rrp),
        weight: sanitizeNumericField(initialData.weight),
        quantity: initialData.quantity ?? 0,
        price_brutto: sanitizeNumericField(initialData.price_brutto),
        shipping_method: sanitizeField(initialData.shipping_method) ?? "",
        note: sanitizeField(initialData.note),
        asin: sanitizeField(initialData.asin) ?? "",
        ean: sanitizeField(initialData.ean) ?? "",
        baselinker_id: sanitizeField(initialData.baselinker_id) ?? "",
        shopify_id: sanitizeField(initialData.shopify_id) ?? "",
        sku: sanitizeField(initialData.sku) ?? "",
        images: (initialData.images || []).map((img: any) => ({
          url: img.url,
          s3Path: img.s3Path,
          altText: img.altText,
          isUploaded: !!img.s3Path,
          needsUpload: false,
          uploadStatus: "completed" as const,
        })),
        ebayLink: initialData.ebayLink || "",
        seoSectionData: initialData.seoSectionData || {
          name: "",
          sections: [],
        },
        specifications: initialData.specifications || [],
      });
    }
  }, [initialData, mode]);

  // Derived values from selected category
  const selectedCategoryObj = useMemo(
    () => findCategoryBySlug(categories, formData.selectedCategory),
    [categories, formData.selectedCategory],
  );

  const currentCategoryKeywords = useMemo(
    () => selectedCategoryObj?.keywords || [],
    [selectedCategoryObj],
  );

  const categoryName = useMemo(
    () => selectedCategoryObj?.name || formData.selectedCategory,
    [selectedCategoryObj, formData.selectedCategory],
  );

  const [isSaving, setIsSaving] = useState(false);

  // Validation and change detection
  const isFormValid = !!(
    formData.title?.trim() && formData.selectedCategory?.trim()
  );

  const hasChanges = useMemo(() => {
    if (mode !== "edit" || !initialData) return false;
    const getNormalizedData = (data, isInitial = false) => ({
      title: data?.title || "",
      condition: data?.condition || "",
      paragraphs: data?.paragraphs || [],
      features: data?.features || [],
      note: data?.note || "",
      asin: data?.asin || "",
      ean: data?.ean || "",
      baselinker_id: data?.baselinker_id || "",
      shopify_id: data?.shopify_id || "",
      selectedCategory: isInitial
        ? data?.category || ""
        : data?.selectedCategory || "",
      images: (data?.images || []).map((img) => ({
        url: img.url,
        s3Path: img.s3Path,
        altText: img.altText,
      })),
      vat_rate: data?.vat_rate ?? "",
      price_brutto: data?.price_brutto ?? "",
      rrp: data?.rrp ?? "",
      weight: data?.weight ?? "",
      quantity: data?.quantity ?? "",
      shipping_method: data?.shipping_method || "",
      sku: data?.sku || "",
      specifications: data?.specifications || [],
    });
    const current = getNormalizedData(formData);
    const original = getNormalizedData(initialData, true);
    const isDifferent = JSON.stringify(current) !== JSON.stringify(original);
    const hasPendingUploads = formData.images.some((i) => i.needsUpload);
    return isDifferent || hasPendingUploads;
  }, [formData, initialData, mode]);

  const shouldShowSave = useMemo(() => {
    if (mode === "create") return isFormValid;
    return hasChanges && isFormValid;
  }, [mode, isFormValid, hasChanges]);

  // Update helper
  const updateForm = (
    updates:
      | Partial<ProductFormState>
      | ((prev: ProductFormState) => Partial<ProductFormState>),
  ) => {
    setFormData((prev: any) => {
      const processed: Record<string, any> = {};
      const actualUpdates =
        typeof updates === "function" ? updates(prev) : updates;
      for (const key in actualUpdates) {
        const value = (actualUpdates as any)[key];
        processed[key] = typeof value === "function" ? value(prev[key]) : value;
      }
      return { ...prev, ...processed };
    });
  };

  // --------------------------------------------------------
  // Compute draft status (for enabling/disabling pricing/logistics)
  // --------------------------------------------------------
  const isDraft = useMemo(() => {
    if (mode !== "edit") return false;
    const missingNumeric =
      formData.vat_rate === "" ||
      formData.vat_rate === null ||
      formData.price_brutto === "" ||
      formData.price_brutto === null ||
      formData.rrp === "" ||
      formData.rrp === null ||
      formData.weight === "" ||
      formData.weight === null ||
      formData.quantity === "" ||
      formData.quantity === null;
    const missingContent =
      formData.images.length === 0 ||
      formData.paragraphs.length === 0 ||
      formData.features.length === 0;
    return missingNumeric || missingContent;
  }, [
    mode,
    formData.vat_rate,
    formData.price_brutto,
    formData.rrp,
    formData.weight,
    formData.quantity,
    formData.images.length,
    formData.paragraphs.length,
    formData.features.length,
  ]);

  // --------------------------------------------------------
  // Compute completeness for the Save button label and behaviour
  // --------------------------------------------------------
  const isComplete = useMemo(() => {
    if (!isFormValid) return false;
    const hasContent =
      formData.images.length > 0 &&
      formData.features.length > 0 &&
      formData.paragraphs.length > 0;

    const vat = formData.vat_rate;
    const price = formData.price_brutto;
    const rrp = formData.rrp;
    const weight = formData.weight;
    const quantity = formData.quantity;

    const hasNumbers =
      vat !== "" &&
      vat !== null &&
      !isNaN(vat) &&
      vat >= 0 &&
      vat <= 30 &&
      price !== "" &&
      price !== null &&
      !isNaN(price) &&
      price > 0 &&
      rrp !== "" &&
      rrp !== null &&
      !isNaN(rrp) &&
      rrp > 0 &&
      weight !== "" &&
      weight !== null &&
      !isNaN(weight) &&
      weight > 0 &&
      quantity !== "" &&
      quantity !== null &&
      !isNaN(quantity) &&
      quantity > 0 &&
      Number.isInteger(quantity);

    return hasContent && hasNumbers;
  }, [
    isFormValid,
    formData.images.length,
    formData.features.length,
    formData.paragraphs.length,
    formData.vat_rate,
    formData.price_brutto,
    formData.rrp,
    formData.weight,
    formData.quantity,
  ]);

  // --------------------------------------------------------
  // Internal save handler with draft/complete logic
  // --------------------------------------------------------
  const handleInternalSave = async (options?: { draft?: boolean }) => {
    const { draft = false } = options || {};

    if (!isFormValid) {
      addNotification({
        message: "Please set a title and category",
        type: "error",
      });
      return;
    }

    // Full validation only when not draft
    if (!draft) {
      const MAX_VAT_RATE = 30;
      const vatRaw = formData.vat_rate;
      const vatNumber = vatRaw === "" ? null : Number(vatRaw);
      if (
        vatNumber === null ||
        isNaN(vatNumber) ||
        vatNumber < 0 ||
        vatNumber > MAX_VAT_RATE
      ) {
        addNotification({
          message: `VAT Rate must be a number between 0 and ${MAX_VAT_RATE}`,
          type: "error",
        });
        return;
      }

      const priceRaw = formData.price_brutto;
      const priceNumber = priceRaw === "" ? null : Number(priceRaw);
      if (priceNumber === null || isNaN(priceNumber) || priceNumber <= 0) {
        addNotification({
          message: "Price must be greater than 0",
          type: "error",
        });
        return;
      }

      const weightRaw = formData.weight;
      const weightNumber = weightRaw === "" ? null : Number(weightRaw);
      if (weightNumber === null || isNaN(weightNumber) || weightNumber <= 0) {
        addNotification({
          message: "Weight must be greater than 0",
          type: "error",
        });
        return;
      }

      const quantityRaw = formData.quantity;
      const quantityNumber = quantityRaw === "" ? null : Number(quantityRaw);
      if (
        quantityNumber === null ||
        isNaN(quantityNumber) ||
        quantityNumber <= 0 ||
        !Number.isInteger(quantityNumber)
      ) {
        addNotification({
          message: "Stock Quantity must be a positive integer greater than 0",
          type: "error",
        });
        return;
      }
    }

    setIsSaving(true);
    const toastId = addNotification({
      message: draft ? "Saving draft..." : "Preparing product data...",
      type: "info",
      progress: 10,
    });

    try {
      const categorySlug = generateSeoSlug(formData.selectedCategory);
      const productSlug = generateSeoSlug(formData.title);
      const slug = `${categorySlug}/${productSlug}`;

      const payload = {
        ...formData,
        slug,
        category: formData.selectedCategory,
        vat_rate: formData.vat_rate === "" ? null : Number(formData.vat_rate),
        price_brutto:
          formData.price_brutto === "" ? null : Number(formData.price_brutto),
        weight: formData.weight === "" ? null : Number(formData.weight),
        quantity: formData.quantity === "" ? null : Number(formData.quantity),
        rrp: sanitizeField(formData.rrp) === null ? null : Number(formData.rrp),
        asin: sanitizeField(formData.asin),
        ean: sanitizeField(formData.ean),
        baselinker_id: sanitizeField(formData.baselinker_id),
        shopify_id: sanitizeField(formData.shopify_id),
        sku: sanitizeField(formData.sku),
        note: sanitizeField(formData.note),
        shipping_method: sanitizeField(formData.shipping_method),
      };

      updateNotification(toastId, {
        message: draft
          ? "Saving draft..."
          : "Uploading images and saving product data...",
        progress: 40,
      });

      const response = await fetch("/api/product/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as SaveProductApiResponse;
      if (!result.success) throw new Error(result.error);

      updateNotification(toastId, {
        message: draft ? "Draft saved!" : "Finalizing product information...",
        progress: 80,
      });

      if (result.updatedImages) {
        const syncedImages = result.updatedImages.map((img) => ({
          ...img,
          isUploaded: true,
          needsUpload: false,
          uploadStatus: "completed" as const,
        }));
        setFormData((prev) => ({ ...prev, images: syncedImages }));
      }

      updateNotification(toastId, {
        message: draft
          ? "Draft saved successfully!"
          : "Product saved successfully!",
        type: "success",
        progress: 100,
      });

      if (mode === "create") {
        setTimeout(() => router.push(`/products/${result.id}`), 500);
      } else {
        setTimeout(() => removeNotification(toastId), 2000);
      }

      return result.id;
    } catch (error: any) {
      console.error("❌ Save Error:", error);
      updateNotification(toastId, {
        message: `Error: ${error.message}`,
        type: "error",
        progress: 0,
      });
      setTimeout(() => removeNotification(toastId), 4000);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------------
  // Unified save handler – decides draft or complete based on isComplete
  // --------------------------------------------------------
  const handleSaveOrDraft = () => {
    // If complete, save as complete (with validation); otherwise as draft
    return handleInternalSave({ draft: !isComplete });
  };

  // ------------------------------------------------------------------
  // Universal import handler (unchanged)
  // ------------------------------------------------------------------
  const handleUniversalBatchImport = (importedData: any) => {
    const updates: Partial<ProductFormState> = {};

    if (importedData.title) updates.title = importedData.title;

    if (importedData.price) {
      let price = importedData.price;
      if (typeof price === "string")
        price = parseFloat(price.replace(/[^0-9.-]/g, ""));
      if (!isNaN(price)) updates.price_brutto = price;
    }

    if (importedData.rrp) {
      let rrp = importedData.rrp;
      if (typeof rrp === "string")
        rrp = parseFloat(rrp.replace(/[^0-9.-]/g, ""));
      if (!isNaN(rrp)) updates.rrp = rrp;
    }

    if (importedData.brand) {
      const currentSpecs = [...(formData.specifications || [])];
      if (importedData.brand && !currentSpecs.some((s) => s.key === "Brand")) {
        currentSpecs.push({
          id: Date.now() + "-brand",
          key: "Brand",
          value: importedData.brand,
        });
      }
      updates.specifications = currentSpecs;
    }

    if (importedData.paragraphs && Array.isArray(importedData.paragraphs)) {
      updates.paragraphs = importedData.paragraphs;
    } else if (
      importedData.description &&
      typeof importedData.description === "string"
    ) {
      const paragraphs = importedData.description
        .split(/\r?\n/)
        .filter((p: string) => p.trim());
      if (paragraphs.length) updates.paragraphs = paragraphs;
    }

    if (importedData.images && importedData.images.length) {
      const limitedImages = importedData.images.slice(0, 16);
      const newImages = limitedImages.map((url: string, idx: number) => ({
        url,
        altText: importedData.title
          ? `${importedData.title} - image ${idx + 1}`
          : `Product image ${idx + 1}`,
        s3Path: null,
        isUploaded: false,
        needsUpload: true,
        uploadStatus: "pending" as const,
      }));
      updates.images = newImages;
      if (importedData.images.length > 16) {
        addNotification({
          message: `Only the first 16 images were imported (${importedData.images.length} total).`,
          type: "warning",
        });
      }
    }

    if (importedData.features && Array.isArray(importedData.features)) {
      updates.features = importedData.features.map((f: any) => ({
        title: f.title || "",
        description: f.description || "",
      }));
    }

    if (importedData.sku) {
      updates.sku = importedData.sku;
    }
    if (importedData.specifications && importedData.specifications.length) {
      const existingKeys = new Set(
        (formData.specifications || []).map((s) => s.key),
      );
      const newSpecs = importedData.specifications.filter(
        (s: any) => !existingKeys.has(s.key),
      );
      if (newSpecs.length) {
        updates.specifications = [
          ...(formData.specifications || []),
          ...newSpecs,
        ];
      }
    }

    updateForm(updates);
    addNotification({
      message: "Imported product data from multiple sources",
      type: "success",
    });
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="w-full min-h-screen flex flex-col gap-2">
      <ProductFormHeader
        mode={mode}
        title={formData.title}
        isSaving={isSaving}
        isFormValid={isFormValid}
        shouldShowSave={shouldShowSave}
        onSave={handleSaveOrDraft}
        selectedCategory={formData.selectedCategory}
        hasPendingUploads={formData.images.some((i) => i.needsUpload)}
        uuid={mode === "edit" ? formData.id : undefined}
        baselinkerId={mode === "edit" ? formData.baselinker_id : undefined}
        shopifyId={mode === "edit" ? formData.shopify_id : undefined}
        onBaselinkerCreated={(id) => updateForm({ baselinker_id: id })}
        onUniversalImport={handleUniversalBatchImport}
        condition={formData.condition}
        categoryKeywords={currentCategoryKeywords}
        isComplete={isComplete}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 px-4">
        <PricingSection
          vat_rate={formData.vat_rate}
          price_brutto={formData.price_brutto}
          rrp={formData.rrp}
          onUpdate={updateForm}
          disabled={mode === "edit" && !isDraft}
        />
        <LogisticsSection
          weight={formData.weight}
          quantity={formData.quantity}
          shipping_method={formData.shipping_method}
          onUpdate={updateForm}
          disabled={mode === "edit" && !isDraft}
        />
        <CategorySelector
          selectedCategory={formData.selectedCategory}
          setSelectedCategory={(val) => updateForm({ selectedCategory: val })}
          categories={categories}
          keywords={currentCategoryKeywords}
        />
        <ConditionSelector
          condition={formData.condition}
          setCondition={(val) => updateForm({ condition: val })}
          selectedCategory={formData.selectedCategory}
          categories={categories}
        />
        <ProductIdentifiersSection
          asin={formData.asin}
          ean={formData.ean}
          onUpdate={updateForm}
        />
        <ExternalPlatformIdsSection
          baselinker_id={formData.baselinker_id}
          shopify_id={formData.shopify_id}
          sku={formData.sku}
          title={formData.title}
          onUpdate={updateForm}
        />
        <SKUManager
          sku={formData.sku}
          title={formData.title}
          condition={formData.condition}
          onSkuChange={(val) => updateForm({ sku: val })}
        />
        <TitleInput
          title={formData.title}
          setTitle={(val) => updateForm({ title: val })}
          categoryKeywords={currentCategoryKeywords}
          categoryName={categoryName}
          specifications={formData.specifications}
        />
      </div>
      <div className="px-4 flex-col flex gap-2">
        <ParagraphsManager
          paragraphs={formData.paragraphs}
          setParagraphs={(val) => updateForm({ paragraphs: val })}
          categoryKeywords={currentCategoryKeywords}
          productTitle={formData.title}
          categoryName={categoryName}
          specifications={formData.specifications}
          features={formData.features}
        />
        <FeaturesManager
          features={formData.features}
          setFeatures={(val) => updateForm({ features: val })}
          categoryKeywords={currentCategoryKeywords}
          productTitle={formData.title}
          categoryName={categoryName}
          specifications={formData.specifications}
        />
        <SpecificationsManager
          specifications={formData.specifications}
          setSpecifications={(val) => updateForm({ specifications: val })}
          categoryKeywords={currentCategoryKeywords}
        />
        <NoteInput
          note={formData.note === null ? "" : formData.note}
          setNote={(val) => updateForm({ note: val === "" ? null : val })}
        />
        <ImagesManager
          images={formData.images}
          setImages={(val) => updateForm({ images: val })}
          title={formData.title}
          selectedCategory={formData.selectedCategory}
          isSaving={isSaving}
        />
        <FeedbackManager
          feedbacks={formData.feedbacks}
          setFeedbacks={(val) => updateForm({ feedbacks: val })}
        />
        <GenerateHTML
          formData={formData}
          categoryName={categoryName}
          categoryContent={categoryContent}
          ebayLink={formData.ebayLink}
        />
        <>
          {formData.selectedCategory &&
          formData.title?.trim() &&
          formData.condition &&
          formData.images?.length > 0 &&
          formData.features?.length > 0 ? (
            <div className="w-full px-5 xl:px-[48px]">
              <h3 className="text-2xl text-center uppercase font-bold text-black dark:text-white">
                Live Preview:
              </h3>
              <LivePreview
                title={formData.title}
                condition={formData.condition}
                images={formData.images}
                paragraphs={formData.paragraphs}
                features={formData.features.map((f) => ({
                  title: f.title,
                  description: f.description,
                }))}
                note={formData.note || undefined}
                feedbacks={formData.feedbacks}
                categoryContent={categoryContent}
                categoryName={`${categoryName} at Rouge Technologies`}
              />
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 border border-gray-300 dark:border-gray-600">
              <p className="text-gray-600 dark:text-gray-400">
                ⚠️ Live preview will appear once you have:
              </p>
              <ul className="mt-3 text-sm text-gray-500 dark:text-gray-400 list-disc list-inside">
                {!formData.selectedCategory && <li>Selected a category</li>}
                {!formData.title?.trim() && <li>Entered a product title</li>}
                {!formData.condition && <li>Selected a condition</li>}
                {formData.images?.length === 0 && (
                  <li>Added at least one image</li>
                )}
                {formData.features?.length === 0 && (
                  <li>Added at least one feature</li>
                )}
              </ul>
            </div>
          )}
        </>
      </div>
    </div>
  );
}
