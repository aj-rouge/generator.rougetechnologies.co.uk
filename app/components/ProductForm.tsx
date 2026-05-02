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
import ProductIdentifiers from "./sections/ProductIdentifiers";
import { useNotification } from "../context/NotificationContext";
import { useRouter } from "next/navigation";
import SpecificationsManager from "./sections/SpecificationsManager";
import LogisticsSection from "./sections/LogisticsSection";
import PricingSection from "./sections/PricingSection";

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
}) {
  const router = useRouter();
  const { addNotification, updateNotification, removeNotification } =
    useNotification();
  const [formData, setFormData] = useState(() => {
    if (mode === "create") return INITIAL_FORM_STATE;
    if (initialData) {
      return {
        ...initialData,
        vat_rate: initialData.vat_rate ?? 0,
        rrp: initialData.rrp ?? "",
        weight: initialData.weight ?? "",
        quantity: initialData.quantity ?? 0,
        price_brutto: initialData.price_brutto ?? "",
        shipping_method: initialData.shipping_method ?? "",
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
        specifications: initialData.specifications || [],
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

  const categoryOptions = useMemo(() => {
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
  }, [categories]);

  const categoryName = useMemo(
    () => selectedCategoryObj?.name || formData.selectedCategory,
    [selectedCategoryObj, formData.selectedCategory],
  );

  // ---------------------------------------------------------------------
  // 3. UI state (not part of product data)
  // ---------------------------------------------------------------------
  const [isSaving, setIsSaving] = useState(false);

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

  const handleInternalSave = async () => {
    if (!isFormValid) {
      addNotification({
        message: "Please fix validation errors",
        type: "error",
      });
      return;
    }

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

    setIsSaving(true);
    const toastId = addNotification({
      message: "Synchronizing R2 Storage Slots...",
      type: "info",
      progress: 40,
    });

    try {
      const categorySlug = generateSeoSlug(formData.selectedCategory);
      const productSlug = generateSeoSlug(formData.title);
      const slug = `${categorySlug}/${productSlug}`;

      // Convert validated fields to numbers for the API
      const payload = {
        ...formData,
        slug,
        category: formData.selectedCategory,
        vat_rate: vatNumber,
        price_brutto: priceNumber,
        weight: weightNumber,
        quantity: quantityNumber,
        rrp: formData.rrp === "" ? null : Number(formData.rrp),
      };

      const response = await fetch("/api/product/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      console.log("✅ ProductForm: Save API returned ID:", result.id);

      if (result.updatedImages) {
        const syncedImages = result.updatedImages.map((img) => ({
          ...img,
          isUploaded: true,
          needsUpload: false,
          uploadStatus: "completed",
        }));
        setFormData((prev) => ({ ...prev, images: syncedImages }));
      }

      updateNotification(toastId, {
        message: "Update Successful!",
        type: "success",
        progress: 100,
      });

      if (mode === "create") {
        setTimeout(() => router.push(`/products/${result.id}`), 500);
      } else {
        setTimeout(() => removeNotification(toastId), 2000);
      }

      // ✅ Explicitly return the product ID
      return result.id;
    } catch (error) {
      console.error("❌ Save Error:", error);
      updateNotification(toastId, {
        message: `Error: ${error.message}`,
        type: "error",
        progress: 0,
      });
      setTimeout(() => removeNotification(toastId), 4000);
      throw error; // Re-throw so caller can handle
    } finally {
      setIsSaving(false);
    }
  };

  const handleEbayImport = (scrapedData) => {
    const { product, itemSpecifics } = scrapedData;

    // --- Price parsing ---
    let priceBrutto = 0;
    if (product.price && product.price !== "N/A") {
      const numericMatch = product.price.match(/[\d,]+\.?\d*/);
      if (numericMatch) {
        priceBrutto = parseFloat(numericMatch[0].replace(/,/g, ""));
      }
    }

    // --- Images mapping ---
    const importedImages = (product.allImages || []).map((url, idx) => ({
      url,
      altText: product.title || `Product image ${idx + 1}`,
      s3Path: null,
      isUploaded: false,
      needsUpload: true,
      uploadStatus: "pending",
    }));

    // --- Specifications from item specifics ---
    const specifications = itemSpecifics
      ? Object.entries(itemSpecifics).map(([name, value]) => ({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${name}`,
          key: name,
          value: typeof value === "string" ? value : JSON.stringify(value),
        }))
      : [];

    // --- Description paragraphs ---
    let paragraphs = [];
    if (
      product.description &&
      product.description !== "No description available."
    ) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = product.description;
      const text = tempDiv.textContent || tempDiv.innerText;
      paragraphs = text.split(/\r?\n/).filter((p) => p.trim().length > 0);
      if (paragraphs.length === 0 && text.trim()) paragraphs = [text.trim()];
    }

    // --- Condition mapping using the selected category ---
    let condition = "";
    const rawCondition = product.condition !== "N/A" ? product.condition : "";

    if (rawCondition && selectedCategoryObj) {
      // Get the condition group options for this category
      const conditionOptions =
        selectedCategoryObj.condition_group?.options || [];

      // Normalize eBay condition string: replace en dash, em dash, etc.
      const normalized = rawCondition
        .replace(/–/g, "-") // en dash to hyphen
        .replace(/—/g, "-") // em dash to hyphen
        .trim();

      // Try to find an exact match (case‑insensitive)
      let matched = conditionOptions.find(
        (opt) => opt.toLowerCase() === normalized.toLowerCase(),
      );

      // If no exact match, try partial match (e.g. "Opened - never used" contains "opened")
      if (!matched) {
        matched = conditionOptions.find(
          (opt) =>
            normalized.toLowerCase().includes(opt.toLowerCase()) ||
            opt.toLowerCase().includes(normalized.toLowerCase()),
        );
      }

      condition = matched || conditionOptions[0] || "";
    }

    // Fallback to simple map if category not yet selected (shouldn't happen because button is disabled)
    if (!condition && rawCondition) {
      const fallbackMap = {
        New: "New",
        "Brand New": "New",
        Used: "Used",
        "Pre-owned": "Used",
        Refurbished: "Refurbished",
        "For parts or not working": "For parts",
      };
      condition = fallbackMap[rawCondition] || "";
    }

    // --- Apply updates ---
    const updates = {
      title: product.title !== "N/A" ? product.title : "",
      condition,
      paragraphs,
      features: [],
      specifications,
      images: importedImages,
      price_brutto: priceBrutto,
    };

    updateForm(updates);
  };

  return (
    <div className="w-full min-h-screen">
      <ProductFormHeader
        mode={mode}
        title={formData.title}
        isSaving={isSaving}
        isFormValid={isFormValid}
        shouldShowSave={shouldShowSave}
        onSave={handleInternalSave}
        selectedCategory={formData.selectedCategory}
        hasPendingUploads={formData.images.some((i) => i.needsUpload)}
        uuid={mode === "edit" ? formData.id : undefined}
        baselinkerId={mode === "edit" ? formData.baselinker_id : undefined}
        shopifyId={mode === "edit" ? formData.shopify_id : undefined}
        onBaselinkerCreated={(id) => updateForm({ baselinker_id: id })}
        onEbayImport={handleEbayImport}
      />
      <div className="flex flex-col px-4 gap-2 pt-60 sm:pt-48 md:pt-52 lg:pt-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <PricingSection
            vat_rate={formData.vat_rate}
            price_brutto={formData.price_brutto}
            rrp={formData.rrp}
            onUpdate={updateForm}
          />
          <LogisticsSection
            weight={formData.weight}
            quantity={formData.quantity}
            shipping_method={formData.shipping_method}
            onUpdate={updateForm}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <CategorySelector
            selectedCategory={formData.selectedCategory}
            setSelectedCategory={(val) => updateForm({ selectedCategory: val })}
            options={categoryOptions}
            keywords={currentCategoryKeywords}
          />
          <ConditionSelector
            condition={formData.condition}
            setCondition={(val) => updateForm({ condition: val })}
            selectedCategory={formData.selectedCategory}
            categories={categories}
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
          <TitleInput
            title={formData.title}
            setTitle={(val) => updateForm({ title: val })}
            categoryKeywords={currentCategoryKeywords}
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
          onAsinEanUpdate={(asin, ean) => updateForm({ asin, ean })}
          asin={formData.asin}
          ean={formData.ean}
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
