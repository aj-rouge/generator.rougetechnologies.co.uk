// app/components/ebay-import-product/EbayImportButton.jsx
"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import EbayImportModal from "./EbayImportModal";
import { scrapeEbayProduct } from "../../../utils/scrape/ebay";

export default function EbayImportButton({ onEbayImport, disabled = false }) {
  const [showModal, setShowModal] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleImport = async (url) => {
    setImportStatus("loading");
    setErrorMessage("");

    try {
      const result = await scrapeEbayProduct(url);
      if (result.success) {
        setImportStatus("success");
        onEbayImport(result.data);
        setTimeout(() => {
          setShowModal(false);
          setImportStatus(null);
        }, 1000);
      } else {
        setImportStatus("error");
        setErrorMessage(result.error || "Failed to scrape eBay product");
      }
    } catch (err) {
      setImportStatus("error");
      setErrorMessage("An unexpected error occurred");
    }
  };

  const closeModal = () => {
    if (importStatus === "loading") return;
    setShowModal(false);
    setImportStatus(null);
    setErrorMessage("");
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
          disabled
            ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed text-gray-200"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
        title={
          disabled ? "Select a category first" : "Import product data from eBay"
        }
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Import from eBay</span>
      </button>

      <EbayImportModal
        isOpen={showModal}
        onClose={closeModal}
        onConfirmImport={handleImport}
        importStatus={importStatus}
        errorMessage={errorMessage}
      />
    </>
  );
}
