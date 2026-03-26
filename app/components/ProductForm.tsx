// app/components/forms/ProductForm.jsx
"use client";

import { useState, useEffect, useMemo } from "react";

import GenerateHTML from "./sections/GenerateHTML";
import LivePreview from "./preview/LivePreview";
import TitleInput from "./sections/TitleInput";
import ConditionSelector from "./sections/ConditionSelector";
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
import ProductIdentifiers from "./sections/ProductIdentifiers";

// Helper to find a category by slug (recursive)
const findCategoryBySlug = (categories, slug) => {
  for (const cat of categories) {
    if (cat.slug === slug) return cat;
    if (cat.children) {
      const found = findCategoryBySlug(cat.children, slug);
      if (found) return found;
    }
  }
  return null;
};

// Flatten category tree into options for the select dropdown
const buildCategoryOptions = (categories) => {
  let options = [];
  categories.forEach((cat) => {
    options.push({ value: cat.slug, label: cat.name });
    if (cat.children && cat.children.length > 0) {
      cat.children.forEach((child, idx, arr) => {
        const prefix = idx === arr.length - 1 ? "└ " : "├ ";
        options.push({ value: child.slug, label: `${prefix} ${child.name}` });
      });
    }
  });
  return options;
};

const INITIAL_FORM_STATE = {
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
  // categoryKeywords and conditionGroup are derived, not stored
};

export default function ProductForm({
  mode = "create", // 'create' or 'edit'
  categories = [], // parsed category tree (required for both modes)
  initialData = null, // only for edit mode
  categoryContent = null, // only for edit mode, optional
}) {
  // ---------------------------------------------------------------------
  // 1. Form state initialisation
  // ---------------------------------------------------------------------
  const [formData, setFormData] = useState(() => {
    if (mode === "create") return INITIAL_FORM_STATE;

    // For edit mode, transform initialData into UI state
    if (initialData) {
      return {
        ...initialData,
        note: initialData.note === "null" ? null : initialData.note,
        images: (initialData.images || []).map((img) => ({
          url: img.url,
          s3Path: img.s3Path,
          altText: img.altText,
          isUploaded: !!img.s3Path,
          needsUpload: false,
          uploadStatus: "completed",
        })),
        baselinker_id: initialData.baselinker_id || "",
        shopify_id: initialData.shopify_id || "",
        ebayLink: initialData.ebayLink || "",
        seoSectionData: initialData.seoSectionData || {
          name: "",
          sections: [],
        },
      };
    }
    return INITIAL_FORM_STATE;
  });

  // If initialData changes (e.g., navigation), update form
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        ...initialData,
        note: initialData.note === "null" ? null : initialData.note,
        images: (initialData.images || []).map((img) => ({
          url: img.url,
          s3Path: img.s3Path,
          altText: img.altText,
          isUploaded: !!img.s3Path,
          needsUpload: false,
          uploadStatus: "completed",
        })),
        baselinker_id: initialData.baselinker_id || "",
        shopify_id: initialData.shopify_id || "",
        ebayLink: initialData.ebayLink || "",
        seoSectionData: initialData.seoSectionData || {
          name: "",
          sections: [],
        },
      });
    }
  }, [initialData, mode]);

  // ---------------------------------------------------------------------
  // 2. Derived values from selected category
  // ---------------------------------------------------------------------
  const selectedCategoryObj = useMemo(
    () => findCategoryBySlug(categories, formData.selectedCategory),
    [categories, formData.selectedCategory],
  );

  const currentCategoryKeywords = useMemo(
    () => selectedCategoryObj?.keywords || [],
    [selectedCategoryObj],
  );

  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories),
    [categories],
  );

  const categoryName = useMemo(
    () => selectedCategoryObj?.name || formData.selectedCategory,
    [selectedCategoryObj, formData.selectedCategory],
  );

  // ---------------------------------------------------------------------
  // 3. UI state (not part of product data)
  // ---------------------------------------------------------------------
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: string;
    progress: number;
  } | null>(null);

  // ---------------------------------------------------------------------
  // 4. Validation and change detection
  // ---------------------------------------------------------------------
  const isFormValid =
    formData.title?.trim() && formData.selectedCategory?.trim();

  // For edit mode: detect changes compared to initialData
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
    });

    const current = getNormalizedData(formData);
    const original = getNormalizedData(initialData, true);
    const isDifferent = JSON.stringify(current) !== JSON.stringify(original);
    const hasPendingUploads = formData.images.some((i) => i.needsUpload);

    return isDifferent || hasPendingUploads;
  }, [formData, initialData, mode]);

  // Should the save button be shown?
  const shouldShowSave = useMemo(() => {
    if (mode === "create") return isFormValid;
    // For edit: show only if there are changes or pending uploads
    return hasChanges && isFormValid;
  }, [mode, isFormValid, hasChanges]);

  // ---------------------------------------------------------------------
  // 5. Update helper
  // ---------------------------------------------------------------------
  const updateForm = (updates) => {
    setFormData((prev) => {
      const processed = {};
      for (const key in updates) {
        const value = updates[key];
        processed[key] = typeof value === "function" ? value(prev[key]) : value;
      }
      return { ...prev, ...processed };
    });
  };

  // ---------------------------------------------------------------------
  // 6. Save handler (common for both modes)
  // ---------------------------------------------------------------------
  const handleAsinEanUpdate = (asin = "", ean = "") => {
    updateForm({ asin, ean });
  };

  const handleInternalSave = async () => {
    if (!isFormValid) {
      setNotification({
        message: "Please fix validation errors",
        type: "error",
        progress: 0,
      });
      return;
    }

    setIsSaving(true);
    setNotification({
      message: "Synchronizing R2 Storage Slots...",
      type: "info",
      progress: 40,
    });

    try {
      const categorySlug = generateSeoSlug(formData.selectedCategory);
      const productSlug = generateSeoSlug(formData.title);
      const slug = `${categorySlug}/${productSlug}`;

      const response = await fetch("/api/product/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slug,
          category: formData.selectedCategory,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      if (result.updatedImages) {
        const syncedImages = result.updatedImages.map((img) => ({
          ...img,
          isUploaded: true,
          needsUpload: false,
          uploadStatus: "completed",
        }));
        setFormData((prev) => ({ ...prev, images: syncedImages }));
      }

      setNotification({
        message: "Update Successful!",
        type: "success",
        progress: 100,
      });
    } catch (error) {
      console.error("❌ Save Error:", error);
      setNotification({
        message: `Error: ${error.message}`,
        type: "error",
        progress: 0,
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 2000);
    }
  };

  // Debug (optional)
  useEffect(() => {
    if (mode === "edit") console.log("Edit formData:", formData);
  }, [formData, mode]);

  // ---------------------------------------------------------------------
  // 7. Render
  // ---------------------------------------------------------------------
  return (
    <div className="w-full min-h-screen">
      <ProductFormHeader
        mode={mode}
        title={formData.title}
        isSaving={isSaving}
        isFormValid={isFormValid}
        shouldShowSave={shouldShowSave}
        onSave={handleInternalSave}
        notification={notification}
        selectedCategory={formData.selectedCategory}
        uuid={mode === "edit" ? formData.id : undefined}
        baselinkerId={mode === "edit" ? formData.baselinker_id : undefined}
        shopifyId={mode === "edit" ? formData.shopify_id : undefined} // ← add this line
      />

      <div className="flex flex-col px-4 gap-2 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <CategorySelector
            selectedCategory={formData.selectedCategory}
            setSelectedCategory={(val) => updateForm({ selectedCategory: val })}
            options={categoryOptions}
            keywords={currentCategoryKeywords}
          />
          <TitleInput
            title={formData.title}
            setTitle={(val) => updateForm({ title: val })}
            categoryKeywords={currentCategoryKeywords}
          />
        </div>

        <ProductIdentifiers
          asin={formData.asin}
          ean={formData.ean}
          baselinker_id={formData.baselinker_id}
          shopify_id={formData.shopify_id}
          onUpdate={updateForm}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <SKUManager
            sku={formData.sku}
            title={formData.title}
            condition={formData.condition}
            onSkuChange={(val) => updateForm({ sku: val })}
          />
          <ConditionSelector
            condition={formData.condition}
            setCondition={(val) => updateForm({ condition: val })}
            selectedCategory={formData.selectedCategory}
            categories={categories}
          />
        </div>

        <ParagraphsManager
          paragraphs={formData.paragraphs}
          setParagraphs={(val) => updateForm({ paragraphs: val })}
          categoryKeywords={currentCategoryKeywords}
        />
        <FeaturesManager
          features={formData.features}
          setFeatures={(val) => updateForm({ features: val })}
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
          onAsinEanUpdate={handleAsinEanUpdate}
        />
        <FeedbackManager
          feedbacks={formData.feedbacks}
          setFeedbacks={(val) => updateForm({ feedbacks: val })}
        />
        <div className="w-full px-5 xl:px-[48px]">
          <h3 className="text-2xl text-center uppercase font-bold text-black dark:text-white">
            Live Preview:
          </h3>
          <LivePreview
            {...formData}
            categoryName={`${categoryName} at Rouge Technologies`}
            seoSectionData={categories}
            categoryContent={categoryContent}
            ebayLink={formData.ebayLink}
          />
        </div>
      </div>
    </div>
  );
}
