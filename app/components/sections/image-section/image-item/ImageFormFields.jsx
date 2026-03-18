"use client";
import { useState, useCallback } from "react";
import { RefreshCw, Minimize2, Maximize2, ExternalLink } from "lucide-react";
import {
  generateSeoAltText,
  generateSeoFileName,
} from "../../../../utils/images/seoGenerator";

export default function ImageFormFields({
  image,
  index,
  productTitle = "",
  category = "",
  isReadOnlyUrl = true,
  handleFieldChange,
  handleImageUpdate,
}) {
  const [expandedS3Path, setExpandedS3Path] = useState(true);
  const [expandedAltText, setExpandedAltText] = useState(true);

  const isLongS3Path = image.s3Path && image.s3Path.length > 60;
  const isLongAltText = image.altText && image.altText.length > 80;
  const showAsLink = isReadOnlyUrl && image.url;

  // New handler for URL pasting that triggers SEO generation
  const handleUrlChange = (newUrl) => {
    const updates = { url: newUrl };

    // Auto-generate SEO fields if context is available
    if (newUrl && productTitle && category) {
      updates.s3Path = generateSeoFileName(category, productTitle, index + 1);
      updates.altText = generateSeoAltText(productTitle, index + 1);
    }

    handleImageUpdate(updates);
  };

  const handleRegenerateSeo = useCallback(() => {
    if (!productTitle || !category || !image.url) return;
    handleImageUpdate({
      s3Path: generateSeoFileName(category, productTitle, index + 1),
      altText: generateSeoAltText(productTitle, index + 1),
    });
  }, [index, category, productTitle, handleImageUpdate, image.url]);

  return (
    <div className="space-y-3">
      {/* 2. SEO File Name (S3 Path) */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            SEO File Name
          </label>
          <button
            onClick={handleRegenerateSeo}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            readOnly
            value={image.s3Path || ""}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono bg-gray-50 dark:bg-gray-900 cursor-not-allowed truncate pr-16"
            placeholder={
              productTitle && category
                ? generateSeoFileName(category, productTitle, index + 1)
                : "path/to/image.webp"
            }
          />
          {image.s3Path && image.s3Path.length > 60 && (
            <button
              onClick={() => setExpandedS3Path(!expandedS3Path)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
            >
              {expandedS3Path ? (
                <Minimize2 size={12} />
              ) : (
                <Maximize2 size={12} />
              )}
            </button>
          )}
        </div>
        {expandedS3Path && image.s3Path && image.s3Path.length > 60 && (
          <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-mono whitespace-pre-wrap break-all">
            {image.s3Path}
          </div>
        )}
      </div>
      {/* 1. URL Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Original Source {!image.url && "*"}
        </label>

        {showAsLink ? (
          <a
            title={image.url}
            target="_blank"
            rel="noopener noreferrer"
            href={image.url}
            className="flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <ExternalLink size={14} className="text-gray-500 flex-shrink-0" />
              <p className="text-sm text-blue-600 dark:text-blue-400 truncate">
                {image.url}
              </p>
            </div>
          </a>
        ) : (
          <div className="relative">
            <input
              type="url"
              value={image.url || ""}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm pr-10 bg-white dark:bg-gray-800"
              placeholder="https://m.media-amazon.com/..."
            />
            {image.url && (
              <button
                type="button"
                onClick={() =>
                  window.open(image.url, "_blank", "noopener,noreferrer")
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-1"
              >
                <ExternalLink size={16} />
              </button>
            )}
          </div>
        )}
        {!image.url && (
          <p className="text-xs text-gray-500 mt-1">
            Provide a URL or upload above
          </p>
        )}
      </div>

      {/* 3. Alt Text */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alt Text
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateSeo}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            {(isLongAltText || expandedAltText) && (
              <button
                onClick={() => setExpandedAltText(!expandedAltText)}
                className="text-gray-500 hover:text-gray-700"
              >
                {expandedAltText ? (
                  <Minimize2 size={12} />
                ) : (
                  <Maximize2 size={12} />
                )}
              </button>
            )}
          </div>
        </div>
        <textarea
          value={image.altText || ""}
          onChange={(e) => handleFieldChange("altText", e.target.value)}
          rows={expandedAltText ? 5 : 1}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 resize-none"
          placeholder={
            productTitle
              ? generateSeoAltText(productTitle, index + 1)
              : "Image description"
          }
        />
        {image.altText && (
          <div
            className={`text-[10px] mt-1 ${
              image.altText.length > 125 ? "text-amber-600" : "text-gray-500"
            }`}
          >
            {image.altText.length} characters{" "}
            {image.altText.length > 125 && "(Over 125 recommended limit)"}
          </div>
        )}
      </div>
    </div>
  );
}
