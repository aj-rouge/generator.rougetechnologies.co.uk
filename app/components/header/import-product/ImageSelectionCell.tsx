import { useState } from "react";
import { Circle, CheckCircle, Check, ImageIcon } from "lucide-react";

interface ImageSelectionCellProps {
  source: any; // ScrapedSource
  sourceIndex: number;
  isSelected: boolean;
  selectedUrls: string[];
  onSelectSource: () => void;
  onToggleImage: (url: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenLightbox: (images: string[], startIndex: number) => void;
}

export function ImageSelectionCell({
  source,
  sourceIndex,
  isSelected,
  selectedUrls,
  onSelectSource,
  onToggleImage,
  onSelectAll,
  onDeselectAll,
  onOpenLightbox,
}: ImageSelectionCellProps) {
  const images = source.product.images;
  const hasImages = Array.isArray(images) && images.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelectSource}
        className="flex items-center gap-2 cursor-pointer"
      >
        {isSelected ? (
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        )}
        <span className="text-sm font-medium">
          Use images from {source.source}
        </span>
      </div>

      {isSelected && hasImages && (
        <div className="mt-2">
          <div className="flex gap-2 mb-2">
            <button
              onClick={onSelectAll}
              className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded"
            >
              Select all
            </button>
            <button
              onClick={onDeselectAll}
              className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
            >
              Deselect all
            </button>
            <span className="text-xs text-gray-500 ml-auto">
              {selectedUrls.length} / {Math.min(images.length, 16)} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
            {images.slice(0, 16).map((url: string, imgIdx: number) => {
              const isChecked = selectedUrls.includes(url);
              return (
                <div key={imgIdx} className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={url}
                    alt={`Thumbnail ${imgIdx + 1}`}
                    className="w-full h-full object-contain rounded border border-gray-200 dark:border-gray-700 cursor-pointer transition group-hover:brightness-75"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(images.slice(0, 16), imgIdx);
                    }}
                    onError={(e) =>
                      (e.currentTarget.src =
                        "https://placehold.co/80x80?text=404")
                    }
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleImage(url);
                    }}
                    className="absolute top-1 left-1 bg-black/50 rounded-full p-0.5 z-10 hover:bg-black/70"
                  >
                    {isChecked ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-white rounded-full" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isSelected && !hasImages && (
        <div className="text-gray-400 text-sm mt-1">No images available</div>
      )}
    </div>
  );
}
