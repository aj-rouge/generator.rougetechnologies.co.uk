"use client";

import { useState, useEffect } from "react";
import { fetchAmazonProductImages } from "../../../utils/images/getImagesfromAmazon";

export default function AmazonImportSection({
  handleAddImages,
  isImageDuplicate,
  onAsinEanUpdate,
  initialAsin = "",
  initialEan = "",
}) {
  const [productId, setProductId] = useState("");
  const [amazonImageUrls, setAmazonImageUrls] = useState([]);
  const [validationResults, setValidationResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [searchInfo, setSearchInfo] = useState(null);

  // Auto-fill the input field when component mounts or when initialAsin/initialEan change
  useEffect(() => {
    if (initialAsin) {
      setProductId(initialAsin);
    } else if (initialEan) {
      setProductId(initialEan);
    }
  }, [initialAsin, initialEan]);

  const validateImages = async (urls) => {
    setIsValidating(true);
    const batchSize = 10;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            const response = await fetch("/api/image/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: url }),
            });
            const data = await response.json();
            return { url, validation: data.validation };
          } catch (error) {
            return {
              url,
              validation: { isValid: false, errors: ["Network error"] },
            };
          }
        }),
      );
      setValidationResults((prev) => {
        const updated = { ...prev };
        batchResults.forEach((res) => {
          updated[res.url] = res.validation;
        });
        return updated;
      });

      if (i + batchSize < urls.length)
        await new Promise((r) => setTimeout(r, 50));
    }
    setIsValidating(false);
  };

  const handleFetchImages = async () => {
    const cleanId = productId.trim();

    setIsLoading(true);
    setSearchInfo(null);
    setAmazonImageUrls([]);
    setValidationResults({});

    try {
      const result = await fetchAmazonProductImages(cleanId);
      setAmazonImageUrls(result.images);

      // Set search info with appropriate metadata
      if (result.source === "Currys") {
        setSearchInfo({
          input: cleanId,
          source: "Currys",
          metadata: result.metadata,
        });
        // Clear ASIN/EAN for Currys
        if (onAsinEanUpdate) onAsinEanUpdate("", "");
      } else if (result.source === "ASIN" || result.source === "EAN") {
        setSearchInfo({
          input: cleanId,
          asin: result.asin,
          source: result.source,
        });
        // Update ASIN/EAN in parent form
        if (onAsinEanUpdate) {
          if (result.source === "ASIN") {
            onAsinEanUpdate(result.asin, "");
          } else if (result.source === "EAN") {
            onAsinEanUpdate(result.asin, cleanId); // cleanId is the EAN
          }
        }
      }

      await validateImages(result.images);
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Input validation helper
  const validateInput = (input) => {
    const trimmed = input.trim();

    // Check for Currys URL
    if (trimmed.includes("currys.co.uk")) {
      const urlRegex = /^https?:\/\/www\.currys\.co\.uk\/products\/.+/i;
      if (!urlRegex.test(trimmed)) {
        return {
          isValid: false,
          type: "URL",
          message: "Please enter a valid Currys product URL",
        };
      }
      return { isValid: true, type: "URL" };
    }

    // Check for ASIN
    if (/^[A-Z0-9]{10}$/i.test(trimmed)) {
      return { isValid: true, type: "ASIN" };
    }

    // Check for EAN
    if (/^\d{8,13}$/.test(trimmed)) {
      return { isValid: true, type: "EAN" };
    }

    // Check for general URL
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return {
        isValid: false,
        type: "URL",
        message:
          "Only Currys.co.uk URLs are supported. For Amazon, use ASIN or EAN.",
      };
    }

    return {
      isValid: false,
      message:
        "Please enter a valid ASIN (10 characters), EAN (8-13 digits), or Currys product URL",
    };
  };

  const handleFetchAmazonImages = async () => {
    const validation = validateInput(productId);

    if (!validation.isValid) {
      alert(validation.message || "Invalid input");
      return;
    }

    handleFetchImages();
  };

  // --- New Logic: Add All Valid Images ---
  const handleAddAll = () => {
    const imagesToAdd = amazonImageUrls.filter((url) => {
      const isDuplicate = isImageDuplicate(url);
      const validation = validationResults[url];
      const isValid = validation ? validation.isValid : true;
      return !isDuplicate && isValid;
    });

    if (imagesToAdd.length > 0) {
      handleAddImages(imagesToAdd);
    }
  };

  // Calculate stats
  const duplicateCount = amazonImageUrls.filter((url) =>
    isImageDuplicate(url),
  ).length;

  const addableImages = amazonImageUrls.filter(
    (url) =>
      !isImageDuplicate(url) && validationResults[url]?.isValid !== false,
  );

  const allImported =
    amazonImageUrls.length > 0 && duplicateCount === amazonImageUrls.length;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Import Product Images
          </h4>
          <p className="text-sm text-gray-500">
            Enter ASIN, EAN, or Currys product URL (ASIN/EAN will be saved)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex-1">
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="ASIN (B08N5WRWND), EAN (1234567890123), or Currys URL"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <button
            onClick={handleFetchAmazonImages}
            disabled={isLoading}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isLoading ? "Fetching..." : "Fetch Images"}
          </button>
        </div>
      </div>

      {/* Search Information */}
      {searchInfo && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Source:
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  searchInfo.source === "Currys"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}
              >
                {searchInfo.source}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Input:
              </span>
              <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs max-w-[200px] truncate">
                {searchInfo.input}
              </code>
            </div>

            {searchInfo.asin && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-700 dark:text-green-300">
                  ASIN:
                </span>
                <code className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-xs">
                  {searchInfo.asin}
                </code>
              </div>
            )}

            {searchInfo.metadata && searchInfo.metadata.productName && (
              <div className="mt-2 sm:mt-0 sm:ml-auto">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {searchInfo.metadata.brand && (
                    <span className="font-medium">
                      {searchInfo.metadata.brand} •{" "}
                    </span>
                  )}
                  {searchInfo.metadata.sku && `SKU: ${searchInfo.metadata.sku}`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isValidating && (
        <div className="flex items-center gap-2 mb-4 text-blue-600 text-sm animate-pulse mt-3">
          <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
          Validating product images...
        </div>
      )}

      {amazonImageUrls.length > 0 && (
        <div className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 dark:border-gray-700 gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                Found {amazonImageUrls.length} images
              </span>
              {duplicateCount > 0 && (
                <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                  {duplicateCount} already in your product list
                </span>
              )}
              {searchInfo?.source === "Currys" && (
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                  From Currys • URLs cleaned for quality
                </span>
              )}
            </div>

            {/* --- ADD ALL BUTTON --- */}
            <button
              onClick={handleAddAll}
              disabled={addableImages.length === 0 || isValidating}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 font-semibold
                ${
                  allImported
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default"
                    : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500"
                }
              `}
            >
              {allImported
                ? "✓ All Images Imported"
                : `Add ${addableImages.length} New Images`}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {amazonImageUrls.map((url, idx) => {
              const validation = validationResults[url];
              const isAdded = isImageDuplicate(url);
              const isValid = validation?.isValid;

              return (
                <div
                  key={idx}
                  className="group relative bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden aspect-square"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                  {/* Status Badges */}
                  <div className="absolute top-1 right-1 flex flex-col gap-1">
                    {isAdded && (
                      <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                        In List
                      </span>
                    )}
                    {validation && !isValid && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                        Small/Bad
                      </span>
                    )}
                    {searchInfo?.source === "Currys" && idx === 0 && (
                      <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                        Main
                      </span>
                    )}
                  </div>
                  {/* Overlay Action */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      disabled={isAdded || (validation && !isValid)}
                      onClick={() => handleAddImages([url])}
                      className="bg-white text-gray-900 text-xs font-bold py-1.5 px-3 rounded-full hover:bg-orange-500 hover:text-white disabled:opacity-30 transition-all"
                    >
                      {isAdded ? "Added" : "+ Add to Product"}
                    </button>
                  </div>
                  {/* Metadata Bar */}
                  {validation?.metadata && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-white px-2 py-1 flex justify-between">
                      <span>
                        {validation.metadata.width}x{validation.metadata.height}
                      </span>
                      <span>
                        {(validation.metadata.size / 1024).toFixed(0)}KB
                      </span>
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-sm px-1 rounded">
                    {idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
