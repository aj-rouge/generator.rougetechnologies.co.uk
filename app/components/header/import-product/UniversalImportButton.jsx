"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import UniversalImportModal from "./UniversalImportModal";

export default function UniversalImportButton({
  onImport,
  disabled = false,
  categoryName = "",
  condition = "",
  categoryKeywords = [],
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className={` h-fit p-3 md:px-4 md:py-2 text-sm my-auto font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
          disabled
            ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed text-gray-200"
            : "bg-indigo-600 hover:bg-indigo-700 text-white"
        }`}
        title={
          disabled
            ? "Select a category first"
            : "Import product data from eBay, Amazon, Currys"
        }
      >
        <Globe className="w-4 h-4" />
        <span className="inline">Import Product</span>
      </button>

      <UniversalImportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onImport={onImport}
        categoryName={categoryName}
        condition={condition}
        categoryKeywords={categoryKeywords}
      />
    </>
  );
}
