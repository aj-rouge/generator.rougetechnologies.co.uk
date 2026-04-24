// app/components/EbayImportButton.jsx
"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import EbayImportModal from "./EbayImportModal";
import { scrapeEbayProduct } from "../../../actions/scrape";

export default function EbayImportButton({ onEbayImport }) {
  const [showModal, setShowModal] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // 'loading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");

  const handleImport = async (url) => {
    setImportStatus("loading");
    setErrorMessage("");

    try {
      const result = await scrapeEbayProduct(url);
      if (result.success) {
        setImportStatus("success");
        // Pass the scraped data to the parent form
        onEbayImport(result.data);
        // Close modal after a short delay to show success state
        setTimeout(() => {
          setShowModal(false);
          setImportStatus(null);
        }, 1000);
      } else {
        setImportStatus("error");
        setErrorMessage(result.error || "Failed to scrape eBay product");
      }
    } catch (err) {
      console.error("Import error:", err);
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
        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
        title="Import product data from eBay"
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
