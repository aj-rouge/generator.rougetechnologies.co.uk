"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SortableImageGrid from "./SortableImageGrid";
import AmazonImportSection from "./AmazonImportSection";
import DownloadButton from "./DownloadButton";
import {
  generateSeoAltText,
  generateSeoFileName,
} from "../../../utils/images/seoGenerator";
import { calculateValidationScore } from "../../../utils/ui/validationHelpers";
import { getStatusBadgeColorFromState } from "../../../utils/ui/statusHelpers";

export default function ImagesManager({
  images,
  setImages,
  title = "",
  selectedCategory = "",
  isSaving,
  onAsinEanUpdate,
  asin = "",
  ean = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasAutoExpanded = useRef(false);

  // Auto-expand once when prerequisites are met
  useEffect(() => {
    if (title && selectedCategory && !hasAutoExpanded.current) {
      setIsOpen(true);
      hasAutoExpanded.current = true;
    }
  }, [title, selectedCategory]);

  const isImageDuplicate = (url) => {
    if (!url) return false;
    return images.some((img) => img.url === url);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const updatedImages = newImages.map((img, i) => ({
      ...img,
      s3Path: generateSeoFileName(selectedCategory, title, i + 1),
      altText: generateSeoAltText(title, i + 1),
    }));
    setImages(updatedImages);
  };

  const handleAddImages = useCallback(
    async (urls) => {
      if (!title || !selectedCategory) {
        alert("Set title and category first");
        return;
      }
      setImages((prev) => {
        const newBatch = urls
          .filter((url) => !prev.some((img) => img.url === url))
          .map((url, index) => ({
            url: url,
            s3Path: generateSeoFileName(
              selectedCategory,
              title,
              prev.length + index + 1,
            ),
            altText: generateSeoAltText(title, prev.length + index + 1),
            isUploading: false,
            isUploaded: false,
            uploadStatus: "pending",
            needsUpload: true,
          }));
        return [...prev, ...newBatch];
      });
    },
    [title, selectedCategory, setImages],
  );

  const hasPrerequisites = title && selectedCategory;
  const pendingUploads = images.filter(
    (img) => img.needsUpload && !img.isUploaded,
  ).length;

  // Validation rules (same as before)
  const validationRules = [
    {
      id: 1,
      name: "Title & Category",
      description: "Product title and category must be set",
      check: () => hasPrerequisites,
      importance: "critical",
    },
    {
      id: 2,
      name: "At Least One Image",
      description: "Add at least one product image",
      check: () => images.length > 0,
      importance: "critical",
      condition: hasPrerequisites,
    },
    {
      id: 3,
      name: "Upload Status",
      description: "All images must be uploaded",
      check: () => pendingUploads === 0,
      importance: "critical",
      condition: hasPrerequisites && images.length > 0,
    },
  ];

  const displayRules = validationRules.filter(
    (rule) => rule.condition !== false,
  );
  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(displayRules);

  const getOverallStatus = () => {
    if (!hasPrerequisites) return "⚠️ Missing Info";
    if (images.length === 0) return "✗ No Images";
    if (pendingUploads > 0) return `⚠️ ${pendingUploads} Pending`;
    return `✓ ${images.length} Image${images.length !== 1 ? "s" : ""}`;
  };

  const badgeColor = getStatusBadgeColorFromState({
    hasCriticalError: hasPrerequisites && images.length === 0,
    hasWarning: !hasPrerequisites || pendingUploads > 0,
    isComplete: allRulesPass,
  });

  const getBorderColor = () => {
    if (!hasPrerequisites)
      return "border-yellow-400 dark:border-yellow-500 border-2";
    if (images.length === 0)
      return "border-red-400 dark:border-red-500 border-2";
    if (pendingUploads > 0)
      return "border-yellow-400 dark:border-yellow-500 border-2";
    if (allRulesPass) return "border-green-500 dark:border-green-500 border-2";
    return "border-gray-300 dark:border-gray-600";
  };

  const getValidationColor = (score) => {
    if (score === 100) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHeaderIcon = () => {
    if (!hasPrerequisites) return "⚠️";
    if (images.length === 0) return "❌";
    if (pendingUploads > 0) return "⚠️";
    if (allRulesPass) return "✅";
    return "⚠️";
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 w-full p-4 rounded-lg ${getBorderColor()} transition-all duration-300`}
    >
      {/* Header button - always visible, clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Image Manager
            </h3>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${badgeColor}`}
            >
              {getOverallStatus()}
            </span>
            {displayRules.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {passedRules}/{totalRules} rules
              </div>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Compact stats row - always visible */}
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
          <span>
            Images: <span className="font-medium">{images.length}</span>
          </span>
          {pendingUploads > 0 && (
            <span className="text-orange-600 dark:text-orange-400">
              ⚠️ {pendingUploads} pending upload
            </span>
          )}
        </div>
      </button>

      {/* Animated dropdown content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
              {!hasPrerequisites ? (
                <div className="p-6 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Please set a product title and select a category to enable
                    image management.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <DownloadButton
                      images={images}
                      productTitle={title}
                      isSaving={isSaving}
                      onError={(error) => alert(error)}
                    />
                  </div>
                  <AmazonImportSection
                    handleAddImages={handleAddImages}
                    isImageDuplicate={isImageDuplicate}
                    onAsinEanUpdate={onAsinEanUpdate}
                    initialAsin={asin}
                    initialEan={ean}
                  />
                  {images.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <SortableImageGrid
                        images={images}
                        setImages={setImages}
                        title={title}
                        selectedCategory={selectedCategory}
                        removeImage={removeImage}
                        isSaving={isSaving}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Validation Rules Section (exactly like FeedbackManager) */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-lg text-gray-800 dark:text-gray-100">
                  <span className="mr-2">{getHeaderIcon()}</span>
                  Image Requirements:
                </p>
              </div>

              <div className="space-y-2">
                {displayRules.map((rule) => {
                  const result = rule.check();
                  return (
                    <div
                      key={rule.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="mt-1">
                        {result ? (
                          <span className="text-green-600 dark:text-green-400">
                            ✓
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            ✗
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                            {rule.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            {rule.importance}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {rule.description}
                        </p>
                        {!result && rule.id === 1 && (
                          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                            ❌ Set title and category first
                          </div>
                        )}
                        {!result && rule.id === 2 && hasPrerequisites && (
                          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                            ❌ Add at least one image
                          </div>
                        )}
                        {!result && rule.id === 3 && hasPrerequisites && (
                          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                            ❌ {pendingUploads} image(s) pending upload
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalRules > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Overall Progress:
                      <span
                        className={`ml-2 ${getValidationColor(validationScore)}`}
                      >
                        {validationScore}%
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            allRulesPass
                              ? "bg-green-500"
                              : passedRules > 0
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${validationScore}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm ${getValidationColor(validationScore)}`}
                      >
                        {!hasPrerequisites
                          ? "Missing Info"
                          : images.length === 0
                            ? "Add Images"
                            : pendingUploads > 0
                              ? "Upload Pending"
                              : allRulesPass
                                ? "Perfect!"
                                : "Needs work"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
