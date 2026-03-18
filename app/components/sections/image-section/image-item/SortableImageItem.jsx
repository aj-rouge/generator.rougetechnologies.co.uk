"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import ImageHeader from "./ImageHeader";
import ImagePreview from "./ImagePreview";
import ImageFormFields from "./ImageFormFields";

export default function SortableImageItem({
  image,
  index,
  totalImages,
  removeImage,
  setImages,
  moveImage,
  productTitle = "",
  category = "",
  isOverlay = false,
  isSaving,
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const id = `image-${index}`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: id,
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isOverlay ? 1000 : "auto",
  };

  const handleImageUpdate = (updatedFields) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, ...updatedFields } : img)),
    );
  };

  const handleRemove = async () => {
    if (totalImages <= 1) return;
    setIsDeleting(true);
    try {
      await removeImage(index);
    } finally {
      setIsDeleting(false);
    }
  };

  const isImageProcessing = isSaving && image.needsUpload && !image.isUploaded;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 dark:bg-gray-900 rounded-lg border transition-all hover:border-blue-400 relative group 
        ${
          index === 0
            ? "border-blue-500 border-2 shadow-sm"
            : "border-gray-200 dark:border-gray-700"
        } 
        ${isDragging ? "shadow-2xl scale-[1.02] rotate-1" : ""}`}
    >
      <ImageHeader
        index={index}
        totalImages={totalImages}
        isOverlay={isOverlay}
        isDeleting={isDeleting}
        sortableAttributes={isMounted && !isOverlay ? attributes : {}}
        sortableListeners={isMounted && !isOverlay ? listeners : {}}
        handleMoveUp={() => moveImage("up", index)}
        handleMoveDown={() => moveImage("down", index)}
        handleRemove={handleRemove}
      />

      {/* Badges */}
      <div className="px-4 pt-3 flex flex-wrap gap-2">
        {index === 0 && (
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-[10px] uppercase font-bold tracking-wider">
            ★ Main Image
          </span>
        )}
        {image.isUploaded && (
          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-[10px] uppercase font-bold tracking-wider">
            ✓ Cloud Stored
          </span>
        )}
      </div>

      <div className="flex px-4 pb-4 flex-col gap-4 mt-2">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 aspect-square flex items-center justify-center overflow-hidden">
          <ImagePreview
            image={image}
            handleImageUpdate={handleImageUpdate}
            isProcessing={isImageProcessing}
            productTitle={productTitle}
            category={category}
            index={index}
          />
        </div>

        <ImageFormFields
          image={image}
          index={index}
          productTitle={productTitle}
          category={category}
          handleImageUpdate={handleImageUpdate} // Crucial for bulk updates
          handleFieldChange={(field, value) =>
            handleImageUpdate({ [field]: value })
          }
        />
      </div>
    </div>
  );
}
