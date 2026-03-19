// app/components/ProductForm.jsx
"use client";

import { useState, useEffect, useMemo } from "react";

import GenerateHTML from "../sections/GenerateHTML";
import LivePreview from "../preview/LivePreview";
import TitleInput from "../sections/TitleInput";
import ConditionSelector from "../sections/ConditionSelector"; // now a pure component
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

export default function ProductForm({
  mode = "create",
  categoriesAndAllRelatedData,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
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

  // Handle ASIN/EAN update from image manager
  const handleAsinEanUpdate = (asin = "", ean = "") => {
    updateForm({ asin, ean });
  };

  const handleInternalSave = async () => {
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
  return (
    <div className="w-full px-4 xl:px-5 bg-gray-200 dark:bg-black min-h-screen">
      <ProductFormHeader
        mode={mode}
        title={formData.title}
        isSaving={isSaving}
        onSave={handleInternalSave}
        notification={notification}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <CategorySelector
            selectedCategory={formData.selectedCategory}
            setSelectedCategory={(val) => updateForm({ selectedCategory: val })}
            categories={categoriesAndAllRelatedData}
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
