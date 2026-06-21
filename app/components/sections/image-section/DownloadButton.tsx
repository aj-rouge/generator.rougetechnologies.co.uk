// DownloadButton.tsx
"use client";

import { useState } from "react";
import { Download } from "lucide-react";

interface DownloadButtonProps {
  images: Array<{
    isUploaded: boolean;
    url?: string;
  }>;
  productTitle: string;
  isSaving?: boolean;
  onDownloadStart?: () => void;
  onDownloadEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
  buttonText?: string;
}

// Added interface for handling standardized error responses from your backend API
interface ApiErrorResponse {
  error?: string;
}

export default function DownloadButton({
  images,
  productTitle,
  isSaving = false,
  onDownloadStart,
  onDownloadEnd,
  onError,
  className = "",
  buttonText = "Download All Images",
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Count uploaded images (ready for download)
  const uploadedCount = images.filter(
    (img) => img.isUploaded && img.url,
  ).length;

  const downloadAllImages = async () => {
    const uploadedImages = images.filter((img) => img.isUploaded && img.url);

    if (uploadedImages.length === 0) {
      const errorMsg =
        "No uploaded images to download. Save the product first.";
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
      return;
    }

    setIsDownloading(true);
    onDownloadStart?.();

    try {
      const response = await fetch("/api/images/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: uploadedImages.map((img) => img.url),
          productTitle: productTitle,
        }),
      });

      if (!response.ok) {
        // Cast the parsed error response to your ApiErrorResponse type
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(errorData.error || "Download failed");
      }

      // Trigger browser download
      const blob = await response.blob();
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${productTitle || "product"}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Download failed";
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsDownloading(false);
      onDownloadEnd?.();
    }
  };

  const isDisabled = uploadedCount === 0 || isSaving || isDownloading;

  return (
    <button
      type="button"
      onClick={downloadAllImages}
      disabled={isDisabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isDisabled
          ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
          : "bg-green-600 hover:bg-green-700 text-white shadow-sm"
      } ${className}`}
    >
      {isDownloading ? (
        <>
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          Zipping...
        </>
      ) : (
        <>
          <Download size={16} />
          {buttonText} ({uploadedCount})
        </>
      )}
    </button>
  );
}
