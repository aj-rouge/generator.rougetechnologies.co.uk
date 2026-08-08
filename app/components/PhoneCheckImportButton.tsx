"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import PhoneCheckImportModal from "./PhoneCheckImportModal";

interface PhoneCheckImportButtonProps {
  categories: any[];
  onImportComplete: () => void;
}

export default function PhoneCheckImportButton({
  categories,
  onImportComplete,
}: PhoneCheckImportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <FileUp className="w-4 h-4" />
        <span className="hidden sm:inline">Import PhoneCheck</span>
      </button>

      <PhoneCheckImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        onImportComplete={onImportComplete}
      />
    </>
  );
}
