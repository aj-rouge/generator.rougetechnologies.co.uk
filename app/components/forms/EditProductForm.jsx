"use client";

import { useState, useEffect, useMemo } from "react";

import GenerateHTML from "../sections/GenerateHTML";
import LivePreview from "../preview/LivePreview";
import TitleInput from "../sections/TitleInput";
import ConditionSelector from "../sections/ConditionSelector";
import ParagraphsManager from "../sections/ParagraphsManager";
import FeaturesManager from "../sections/FeaturesManager";
import NoteInput from "../sections/NoteInput";
import ImagesManager from "../sections/image-section/ImagesManager";
import FeedbackManager from "../sections/FeedbackManager";
import CategorySelector from "../sections/CategorySelector";

import { DEFAULT_FEEDBACKS } from "../../data/feedbacks";
import ProductFormHeader from "../header/ProductFormHeader";
import { generateSeoSlug } from "../../utils/images/seoGenerator";
import SKUManager from "../sections/SKUManager";
import ProductIdentifiers from "../sections/ProductIdentifiers";

// Helper to find a category by slug (recursive)
export const findCategoryBySlug = (categories, slug) => {
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
    // Parent option with bold styling
    options.push({
      value: cat.slug,
      label: cat.name,
    });
    // Children options with indentation and tree lines
    if (cat.children && cat.children.length > 0) {
      cat.children.forEach((child, idx, arr) => {
        const prefix = idx === arr.length - 1 ? "└ " : "├ ";
        options.push({
          value: child.slug,
          label: `${prefix} ${child.name}`,
        });
      });
    }
  });
  return options;
};

export default function EditProductForm({
  initialData = {
    sku: null,
    title: null,
    condition: null,
    paragraphs: [],
    features: [],
    seoSectionData: { name: null, sections: [] },
    selectedCategory: null,
    note: null,
    feedbacks: null,
    images: [],
    asin: null,
    ean: null,
    baselinker_id: null,
    shopify_id: null,
    ebayLink: null,
    categoryKeywords: [],
    conditionGroup: null,
  },
  categories,
  categoryContent,
}) {
  const [formData, setFormData] = useState(initialData);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({
    message: "",
    type: "",
    progress: 0,
  });
  const categoryName = useMemo(() => {
    if (!formData.selectedCategory || !categories) return "";
    const cat = findCategoryBySlug(categories, formData.selectedCategory);
    return cat?.name || formData.selectedCategory;
  }, [formData.selectedCategory, categories]);
  const updateForm = (updates) => {
    setFormData((prev) => {
      const processedUpdates = {};
      for (const key in updates) {
        const value = updates[key];
        processedUpdates[key] =
          typeof value === "function" ? value(prev[key]) : value;
      }
      return { ...prev, ...processedUpdates };
    });
  };

  // ------------------------------------------------------------------------
  // 1. Initialise form from server data (only runs once on mount)
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!initialData) return;

    const internalImages =
      initialData.images?.map((extImg) => ({
        url: extImg.url,
        s3Path: extImg.s3Path,
        altText: extImg.altText,
        isUploaded: !!extImg.s3Path,
        needsUpload: false,
        uploadStatus: "completed",
      })) || [];

    setFormData({
      ...initialData,
      note: initialData.note === "null" ? null : initialData.note,
      images: internalImages,
      baselinker_id: initialData.baselinker_id || "",
      shopify_id: initialData.shopify_id || "",
      categoryKeywords: initialData.categoryKeywords || [],
      ebayLink: initialData.ebayLink || "",
      seoSectionData: initialData.seoSectionData || { name: "", sections: [] },
    });
  }, [initialData]);

  // ------------------------------------------------------------------------
  // 2. Derive keywords from selected category
  // ------------------------------------------------------------------------
  const selectedCat = useMemo(() => {
    if (!formData.selectedCategory || !categories) return null;
    return findCategoryBySlug(categories, formData.selectedCategory);
  }, [formData.selectedCategory, categories]);

  // Keywords for the currently selected category
  const currentCategoryKeywords = useMemo(
    () => selectedCat?.keywords || [],
    [selectedCat],
  );

  // Flattened category options for the dropdown
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categories),
    [categories],
  );

  // ------------------------------------------------------------------------
  // 3. Determine if there are unsaved changes
  // ------------------------------------------------------------------------
  const isFormValid =
    formData.title?.trim() && formData.selectedCategory?.trim();

  const hasChanges = useMemo(() => {
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

    const currentData = getNormalizedData(formData);
    const originalData = getNormalizedData(initialData, true);

    const isDifferent =
      JSON.stringify(currentData) !== JSON.stringify(originalData);
    const hasPendingUploads = formData.images.some((i) => i.needsUpload);

    return isDifferent || hasPendingUploads;
  }, [formData, initialData]);

  // ------------------------------------------------------------------------
  // 4. Save handler
  // ------------------------------------------------------------------------
  const handleAsinEanUpdate = (asin = "", ean = "") => {
    updateForm({ asin, ean });
  };

  const handleInternalSave = async () => {
    if (!isFormValid) {
      setNotification({
        message: "Please fix validation errors",
        type: "error",
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

        setFormData((prev) => ({
          ...prev,
          images: syncedImages,
        }));
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

  // Debug log
  useEffect(() => {
    console.log("formData updated:", formData);
  }, [formData]);

  return (
    <div className="w-full px-4 xl:px-5 bg-gray-200 dark:bg-black min-h-screen">
      <ProductFormHeader
        mode={"edit"}
        title={formData.title}
        isSaving={isSaving}
        isFormValid={isFormValid}
        shouldShowSave={
          (hasChanges || formData.images.some((i) => i.needsUpload)) &&
          isFormValid
        }
        onSave={handleInternalSave}
        notification={notification}
        selectedCategory={formData.selectedCategory}
        uuid={formData.id}
        baselinkerId={formData.baselinker_id}
      />
      <div className="flex flex-col gap-2">
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
          showIdentifiers={!!(formData.asin || formData.ean)}
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
            categories={categories} // Pass categories to ConditionSelector
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
          setNote={(val) =>
            updateForm({
              note: val === "" ? null : val,
            })
          }
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
        <GenerateHTML formData={formData} />
        <div className="w-full px-5 xl:px-[48px]">
          <h3 className="text-2xl text-center uppercase font-bold text-black dark:text-white">
            Live Preview:
          </h3>
          <LivePreview
            {...formData}
            categoryName={categoryName} // new prop
            seoSectionData={categories} // keep if needed elsewhere
            categoryContent={categoryContent}
            ebayLink={formData.ebayLink}
          />
        </div>
      </div>
    </div>
  );
}
