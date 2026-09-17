"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
      <AnimatePresence mode="wait">
        {!disabled && (
          <motion.button
            key="import-button"
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={() => setShowModal(true)}
            className="h-fit p-3 md:px-4 md:py-2 text-sm my-auto font-medium rounded-lg flex items-center gap-1.5 transition-colors bg-indigo-600 hover:bg-indigo-700 text-white"
            title="Import product data from eBay, Amazon, Currys"
          >
            <Globe className="w-4 h-4" />
            <span className="inline">Import Product</span>
          </motion.button>
        )}
      </AnimatePresence>

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
