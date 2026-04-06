// ImagesManager.tsx
"use client";

import { useCallback } from "react";
import SortableImageGrid from "./SortableImageGrid";
import AmazonImportSection from "./AmazonImportSection";
import DownloadButton from "./DownloadButton"; // Import the new component
import {
  generateSeoAltText,
  generateSeoFileName,
} from "../../../utils/images/seoGenerator";

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
  // Helper to check for duplicates
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

  // Handle Amazon URLs
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
    [title, selectedCategory],
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="mb-6 flex justify-between items-start flex-wrap gap-2">
        <div>
          <h3 className="text-xl font-bold">Image Manager</h3>
          <p className="text-sm text-gray-500">
            Images will be uploaded when you click save product.
            {images.some((img) => img.needsUpload && !img.isUploaded) && (
              <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                (
                {
                  images.filter((img) => img.needsUpload && !img.isUploaded)
                    .length
                }{" "}
                pending upload)
              </span>
            )}
          </p>
        </div>

        <DownloadButton
          images={images}
          productTitle={title}
          isSaving={isSaving}
          onError={(error) => alert(error)}
        />
      </div>

      {/* Rest of the component remains exactly the same */}
      {!title || !selectedCategory ? (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
          Set Title and Category First
        </div>
      ) : (
        <>
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
  );
}
