// app/components/EbayImportModal.jsx
"use client";

import { useState } from "react";
import { Loader2, X, ShoppingBag, AlertCircle } from "lucide-react";

export default function EbayImportModal({
  isOpen,
  onClose,
  onConfirmImport,
  importStatus,
  errorMessage,
}) {
  const [url, setUrl] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onConfirmImport(url.trim());
  };

  const isLoading = importStatus === "loading";
  const isSuccess = importStatus === "success";
  const isError = importStatus === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 text-purple-600 dark:text-purple-500">
            <ShoppingBag className="w-6 h-6" />
            <h3 className="text-xl font-bold">Import from eBay</h3>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="text-green-600 dark:text-green-500 font-semibold">
                ✓ Product data imported successfully!
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                eBay Product URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.ebay.co.uk/itm/..."
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-black dark:text-white"
                required
                disabled={isLoading}
                autoFocus
              />
              {isError && (
                <div className="mt-2 flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? "Importing..." : "Import Product"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
