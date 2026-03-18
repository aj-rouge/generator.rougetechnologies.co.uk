// app/components/ProductForm.jsx
"use client";

import { useState, useEffect, useMemo } from "react";

import GenerateHTML from "./sections/GenerateHTML";
import LivePreview from "./preview/LivePreview";
import TitleInput from "./sections/TitleInput";
import ConditionSelector from "./sections/ConditionSelector"; // now a pure component
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

const INITIAL_FORM_STATE = {
  sku: "",
  title: "",
  condition: "",
  paragraphs: [],
  features: [],
  seoSectionData: { name: "", sections: [] },
  selectedCategory: "",
  note: "",
  feedbacks: DEFAULT_FEEDBACKS,
  images: [],
  asin: "",
  ean: "",
  baselinker_id: "",
  shopify_id: "",
  ebayLink: "",
  categoryKeywords: [],
  conditionGroup: null,
};

const fetchCategoryData = async (categoryName) => {
  try {
    const response = await fetch(
      `/api/category/data?name=${encodeURIComponent(categoryName)}`,
    );
    const data = await response.json();
    console.log("Fetched category data:", data);
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
};

export default function ProductForm({
  mode = "create",
  initialData = null,
  pageTitle = "Create New Product",
}) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isLoadingCategoryData, setIsLoadingCategoryData] = useState(false);

  // ---------- Condition‑related state (formerly inside ConditionSelector) ----------
  const [conditionOptions, setConditionOptions] = useState(null);
  const [conditionGroup, setConditionGroup] = useState(null);
  const [conditionLoading, setConditionLoading] = useState(false);
  const [conditionError, setConditionError] = useState(null);
  const [validationState, setValidationState] = useState({
    isValid: null,
    suggestedCondition: null,
  });
  // ---------------------------------------------------------------------------------

  // UI state (keep separate from form data as these aren't saved)
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
        // If the value is a function, execute it with the previous field value
        processedUpdates[key] =
          typeof value === "function" ? value(prev[key]) : value;
      }

      return { ...prev, ...processedUpdates };
    });
  };

  // Sync Initial Data
  useEffect(() => {
    if (initialData) {
      // Clean the note field if it's the string "null"
      const cleanedNote = initialData.note === "null" ? null : initialData.note;

      // Convert external images to internal format
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
        ...INITIAL_FORM_STATE,
        ...initialData,
        note: cleanedNote, // Use the cleaned value
        selectedCategory: initialData.category || "",
        images: internalImages,
        baselinker_id: initialData.baselinker_id || "",
        shopify_id: initialData.shopify_id || "",
      });
    }
  }, [initialData]);

  // Load category data (keywords, ebayLink, etc.) when category changes
  useEffect(() => {
    const loadCategoryData = async () => {
      if (!formData.selectedCategory) return;

      setIsLoadingCategoryData(true);
      try {
        const categoryData = await fetchCategoryData(formData.selectedCategory);
        if (categoryData) {
          const generatedName = `${formData.selectedCategory} at Rouge Technologies`;

          const updates = {
            categoryKeywords: categoryData.keywords || [],
            ebayLink: categoryData.ebayLink || "",
            conditionGroup: categoryData.conditionGroup,
          };

          // Only auto‑load SEO sections if they are empty and we have content
          if (
            (!formData.seoSectionData.sections ||
              formData.seoSectionData.sections.length === 0) &&
            categoryData.content
          ) {
            updates.seoSectionData = {
              name: generatedName,
              sections: categoryData.content.sections || [],
            };
            // Reset condition for new products
            if (mode === "create") updates.condition = "";
          }

          updateForm(updates);
        }
      } catch (error) {
        console.error("Error loading category data:", error);
      } finally {
        setIsLoadingCategoryData(false);
      }
    };

    loadCategoryData();
  }, [formData.selectedCategory, mode]);

  // ---------- Fetch condition options when category changes ----------
  useEffect(() => {
    const fetchConditions = async () => {
      if (!formData.selectedCategory) {
        setConditionOptions(null);
        setConditionGroup(null);
        setValidationState({ isValid: null, suggestedCondition: null });
        return;
      }

      setConditionLoading(true);
      setConditionError(null);

      try {
        const res = await fetch(
          `/api/category/conditions?name=${encodeURIComponent(
            formData.selectedCategory,
          )}`,
        );
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const { options, conditionGroup, metadata } = data.data;

        setConditionOptions(options || null);
        setConditionGroup(conditionGroup);

        // Determine the initial condition to set (only if category changed)
        let newCondition = "";
        if (metadata?.suggestedCondition) {
          newCondition = metadata.suggestedCondition;
        } else if (metadata?.defaultOption) {
          newCondition = metadata.defaultOption;
        } else {
          newCondition = options?.[0]?.value || "";
        }

        // Only update if different (prevents unnecessary re‑renders)
        if (newCondition !== formData.condition) {
          setFormData((prev) => ({ ...prev, condition: newCondition }));
        }

        setValidationState({
          isValid: metadata?.isValid ?? null,
          suggestedCondition: metadata?.suggestedCondition ?? null,
        });
      } catch (err) {
        setConditionError(err.message);
        setConditionOptions(null);
      } finally {
        setConditionLoading(false);
      }
    };

    fetchConditions();
  }, [formData.selectedCategory]); // ✅ only runs when category changes

  // ---------- Validate condition when it changes ----------
  useEffect(() => {
    const validate = async () => {
      if (!formData.selectedCategory || !formData.condition) return;

      try {
        const res = await fetch("/api/category/conditions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryName: formData.selectedCategory,
            condition: formData.condition,
          }),
        });

        const data = await res.json();
        if (!data.success) return;

        const { isValid, suggestedCondition } = data.data;

        setValidationState({ isValid, suggestedCondition });

        // Auto‑correct if invalid and a suggestion exists (prevents loops by checking inequality)
        if (
          !isValid &&
          suggestedCondition &&
          suggestedCondition !== formData.condition
        ) {
          setFormData((prev) => ({ ...prev, condition: suggestedCondition }));
        }
      } catch (e) {
        // Silently fail – validation is non‑critical
      }
    };

    validate();
  }, [formData.condition, formData.selectedCategory]); // ✅ runs when condition or category changes
  // -----------------------------------------------------------------

  const isFormValid = formData.title.trim() && formData.selectedCategory.trim();

  const hasChanges = useMemo(() => {
    // 1. If we are in "create" mode, simply check if the title exists
    if (mode === "create") return formData.title.trim().length > 0;

    // 2. Define exactly which core fields we want to track for changes
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

    // 3. Deep comparison of the cleaned objects
    const isDifferent =
      JSON.stringify(currentData) !== JSON.stringify(originalData);

    // 4. Force 'true' if there are new files waiting for their first upload
    const hasPendingUploads = formData.images.some((i) => i.needsUpload);

    return isDifferent || hasPendingUploads;
  }, [formData, initialData, mode]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  // Handle ASIN/EAN update from image manager
  const handleAsinEanUpdate = (asin = "", ean = "") => {
    updateForm({ asin, ean });
  };

  const handleInternalSave = async () => {
    if (!isFormValid) {
      showNotification("Please fix validation errors", "error");
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

      // ✅ SYNC STATE: Update formData with finalized image data from R2
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

  const handleDelete = async () => {
    // 1. Confirm with user
    if (
      !window.confirm(
        "Are you sure you want to delete this product? This will remove all images from R2 and data from KV/D1. This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsSaving(true);
    setNotification({
      message: "Purging Product Data across R2, KV, and D1...",
      type: "info",
      progress: 30,
    });

    try {
      const categorySlug = generateSeoSlug(formData.selectedCategory);
      const productSlug = generateSeoSlug(formData.title);
      const slug = `${categorySlug}/${productSlug}`;

      const response = await fetch("/api/product/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          category: formData.selectedCategory,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setNotification({
        message: "Product Deleted Successfully!",
        type: "success",
        progress: 100,
      });

      // Redirect to home/dashboard after short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error("❌ Delete Error:", error);
      setNotification({
        message: `Delete failed: ${error.message}`,
        type: "error",
        progress: 0,
      });
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full px-4 xl:px-5 bg-gray-200 dark:bg-black min-h-screen">
      <ProductFormHeader
        mode={mode}
        title={formData.title}
        pageTitle={pageTitle}
        isSaving={isSaving}
        isFormValid={isFormValid}
        shouldShowSave={
          (hasChanges || formData.images.some((i) => i.needsUpload)) &&
          isFormValid
        }
        onSave={handleInternalSave}
        onDelete={handleDelete}
        notification={notification}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <CategorySelector
            selectedCategory={formData.selectedCategory}
            setSelectedCategory={(val) => updateForm({ selectedCategory: val })}
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
          {" "}
          <SKUManager
            sku={formData.sku}
            title={formData.title}
            condition={formData.condition}
            onSkuChange={(val) => updateForm({ sku: val })}
          />
          {/* UPDATED: ConditionSelector now receives all necessary props */}
          <ConditionSelector
            condition={formData.condition}
            setCondition={(val) => updateForm({ condition: val })}
            selectedCategory={formData.selectedCategory}
            conditionOptions={conditionOptions}
            conditionGroup={conditionGroup}
            validationState={validationState}
            isLoading={conditionLoading}
            error={conditionError}
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
              note: val === "" ? null : val, // This would convert empty string back to null
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
        {/* <SeoSectionManager
          seoSectionData={seoSectionData}
          setSeoSectionData={setSeoSectionData}
          selectedCategory={selectedCategory}
          categoryKeywords={getKeywordsByCategoryName(
            selectedCategory,
            categories
          )}
        /> */}
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
