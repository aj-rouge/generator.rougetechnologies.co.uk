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
}) {
  const [formData, setFormData] = useState(initialData);

  // Condition‑related state (no longer fetched – derived from initialData)
  const [conditionOptions, setConditionOptions] = useState(null);
  const [conditionGroup, setConditionGroup] = useState(null);
  const [validationState, setValidationState] = useState({
    isValid: null,
    suggestedCondition: null,
  });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({
    message: "",
    type: "",
    progress: 0,
  });

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

    const cleanedNote = initialData.note === "null" ? null : initialData.note;
    const internalImages =
      initialData.images?.map((extImg) => ({
        url: extImg.url,
        s3Path: extImg.s3Path,
        altText: extImg.altText,
        isUploaded: !!extImg.s3Path,
        needsUpload: false,
        uploadStatus: extImg.s3Path ? "completed" : "pending",
      })) || [];

    setFormData({
      ...initialData,
      note: cleanedNote,
      selectedCategory: initialData.category || "",
      images: internalImages,
      baselinker_id: initialData.baselinker_id || "",
      shopify_id: initialData.shopify_id || "",
      conditionGroup: initialData.conditionGroup || null,
      categoryKeywords: initialData.categoryKeywords || [],
      ebayLink: initialData.ebayLink || "",
      seoSectionData: initialData.seoSectionData || { name: "", sections: [] },
    });

    // Also set condition state from the conditionGroup
    if (initialData.conditionGroup?.options) {
      setConditionOptions(initialData.conditionGroup.options);
      setConditionGroup(initialData.conditionGroup);
    }
  }, [initialData]); // empty dependency array ensures it runs once

  // ------------------------------------------------------------------------
  // 2. Validate condition locally whenever it changes
  //    (no API call – uses the options from initialData)
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (
      !formData.selectedCategory ||
      !formData.condition ||
      !conditionOptions
    ) {
      setValidationState({ isValid: null, suggestedCondition: null });
      return;
    }

    // Check if current condition is in the allowed options
    const isValid = conditionOptions.some(
      (opt) => opt.value === formData.condition || opt === formData.condition,
    );

    let suggestedCondition = null;
    if (!isValid && conditionOptions.length > 0) {
      // Suggest the first valid option
      suggestedCondition = conditionOptions[0]?.value || conditionOptions[0];
    }

    setValidationState({ isValid, suggestedCondition });

    // Auto‑correct if invalid and a suggestion exists
    if (
      !isValid &&
      suggestedCondition &&
      suggestedCondition !== formData.condition
    ) {
      setFormData((prev) => ({ ...prev, condition: suggestedCondition }));
    }
  }, [formData.condition, formData.selectedCategory, conditionOptions]);

  // ------------------------------------------------------------------------
  // 3. Determine if there are unsaved changes
  // ------------------------------------------------------------------------
  const isFormValid = formData.title.trim() && formData.selectedCategory.trim();

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
  // ADDED: Log formData after every update
  // ------------------------------------------------------------------------
  useEffect(() => {
    console.log("formData updated:", formData);
  }, [formData]);

  // ------------------------------------------------------------------------
  // 4. Save and delete handlers (still make network calls)
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
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <CategorySelector
            selectedCategory={formData.selectedCategory}
            setSelectedCategory={(val) => updateForm({ selectedCategory: val })}
            disabled={true}
          />
          <TitleInput
            title={formData.title}
            setTitle={(val) => updateForm({ title: val })}
            categoryKeywords={formData.categoryKeywords}
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
            conditionOptions={conditionOptions}
            conditionGroup={conditionGroup}
            validationState={validationState}
            isLoading={false} // No loading needed – data already present
            error={null}
          />
        </div>

        <ParagraphsManager
          paragraphs={formData.paragraphs}
          setParagraphs={(val) => updateForm({ paragraphs: val })}
          categoryKeywords={formData.categoryKeywords}
        />
        <FeaturesManager
          features={formData.features}
          setFeatures={(val) => updateForm({ features: val })}
          categoryKeywords={formData.categoryKeywords}
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
          <LivePreview {...formData} ebayLink={formData.ebayLink} />
        </div>
      </div>
    </div>
  );
}
