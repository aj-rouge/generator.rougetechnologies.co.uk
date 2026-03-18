"use client";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Trash2,
  Loader2,
} from "lucide-react";
import React from "react";

const ImageHeader = ({
  index,
  totalImages,
  isOverlay,
  isDeleting,
  sortableAttributes,
  sortableListeners,
  handleMoveUp,
  handleMoveDown,
  handleRemove,
}) => {
  return (
    <div className="flex items-center gap-2 z-10">
      <div
        className={`p-2 rounded-t-lg flex flex-row justify-between w-full bg-gray-50 items-center dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors 
            ${
              isOverlay
                ? "cursor-grabbing"
                : "cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
        {...sortableAttributes}
        {...sortableListeners}
        // Prevents button clicks from triggering drag start
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <GripVertical size={20} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
        </div>

        <div className="flex flex-row gap-1 bg-white dark:bg-gray-700 rounded-md p-1 shadow-sm">
          {index !== 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMoveUp();
              }}
              className="p-1 text-gray-500 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Move up"
            >
              <ChevronLeft size={16} className="hidden md:block" />
              <ChevronUp size={16} className="block md:hidden" />
            </button>
          )}

          {index !== totalImages - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMoveDown();
              }}
              className="p-1 text-gray-500 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Move down"
            >
              <ChevronRight size={16} className="hidden md:block" />
              <ChevronDown size={16} className="block md:hidden" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          disabled={totalImages <= 1 || isDeleting}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            isDeleting
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400"
              : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
          } rounded-md disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5`}
        >
          {isDeleting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <Trash2 size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageHeader;
