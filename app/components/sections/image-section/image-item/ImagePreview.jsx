"use client";
import { useState, useRef, useEffect } from "react";
import { Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import {
  generateSeoAltText,
  generateSeoFileName,
} from "../../../../utils/images/seoGenerator";

export default function ImagePreview({
  image,
  handleImageUpdate,
  isProcessing,
  productTitle,
  category,
  index,
}) {
  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (image.url?.startsWith("blob:")) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  // NEW: Function to upload file immediately
  const uploadFile = async (file, seoPath) => {
    setUploading(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("s3Path", seoPath);
      uploadData.append("category", category || "product");
      uploadData.append("productTitle", productTitle || "image");

      const response = await fetch("/api/image/upload", {
        method: "POST",
        body: uploadData,
      });

      const result = await response.json();

      if (result.success) {
        handleImageUpdate({
          url: result.url,
          s3Path: seoPath,
          altText: generateSeoAltText(productTitle || "image", index + 1),
          needsUpload: true,
          isUploaded: true,
          uploadStatus: "completed",
          file: undefined,
        });
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);

      // Fallback to blob URL if upload fails
      handleImageUpdate({
        url: URL.createObjectURL(file),
        file: file, // Keep file for later upload
        s3Path: seoPath,
        altText: generateSeoAltText(productTitle || "image", index + 1),
        needsUpload: true,
        isUploaded: false,
        uploadStatus: "failed",
        error: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      alert("File size must be less than 16MB");
      return;
    }
    const tempPath = `temp-uploads/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;

    await uploadFile(file, tempPath);
  };

  // 2. STRICT NULL CHECK: If no URL exists, show the Upload Box
  if (!image || (image && !image.url && !image.s3Path)) {
    return (
      <div className="text-center text-gray-400 p-4 w-full">
        <div className="text-4xl mb-3">
          <ImageIcon size={48} className="mx-auto" />
        </div>
        <p className="text-sm mb-4">No image</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isProcessing}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md w-full transition-colors ${
              uploading || isProcessing
                ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            }`}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            <span>{uploading ? "Uploading..." : "Upload from Computer"}</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                OR
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste URL below to use external image
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
        />
      </div>
    );
  }

  // --- Render State: Image Preview ---
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img
        src={image.url || image}
        alt={"Product preview"}
        className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
          uploading || isProcessing ? "opacity-40" : "opacity-100"
        }`}
        onError={(e) => {
          if (image.url || image) {
            setImageError(true);
            e.target.onerror = null;
            e.target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='8' text-anchor='middle' fill='%239ca3af'%3EInvalid Image URL%3C/text%3E%3C/svg%3E";
          }
        }}
        onLoad={() => setImageError(false)}
      /> 

      {(uploading || isProcessing) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/40">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          {uploading && (
            <div className="absolute bottom-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
              Uploading...
            </div>
          )}
        </div>
      )}

      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400 text-sm">
            Failed to load image
          </p>
        </div>
      )}
    </div>
  );
}
