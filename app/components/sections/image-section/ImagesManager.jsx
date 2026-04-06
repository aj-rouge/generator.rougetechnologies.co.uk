"use client";

import { useCallback, useState } from "react";
import JSZip from "jszip";
import { Download } from "lucide-react";
import SortableImageGrid from "./SortableImageGrid";
import AmazonImportSection from "./AmazonImportSection";
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
  const [isDownloading, setIsDownloading] = useState(false);

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
  // NEW: Download all uploaded images as ZIP
  const downloadAllImages = async () => {
    const uploadedImages = images.filter((img) => img.isUploaded && img.url);
    if (uploadedImages.length === 0) {
      alert("No uploaded images to download. Save the product first.");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch("/api/images/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: uploadedImages.map((img) => img.url),
          productTitle: title,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Download failed");
      }

      // Trigger browser download
      const blob = await response.blob();
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${title || "product"}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert(error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Count uploaded images (ready for download)
  const uploadedCount = images.filter(
    (img) => img.isUploaded && img.url,
  ).length;

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

        {/* DOWNLOAD BUTTON - only enabled if there are uploaded images */}
        <button
          type="button"
          onClick={downloadAllImages}
          disabled={uploadedCount === 0 || isSaving || isDownloading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            uploadedCount === 0 || isSaving || isDownloading
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white shadow-sm"
          }`}
        >
          {isDownloading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Zipping...
            </>
          ) : (
            <>
              <Download size={16} />
              Download All Images ({uploadedCount})
            </>
          )}
        </button>
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
