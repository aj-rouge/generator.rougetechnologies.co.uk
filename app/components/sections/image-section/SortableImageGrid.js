"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import SortableImageItem from "./image-item/SortableImageItem";
import AddImageButton from "./AddImageButton";
import {
  generateSeoAltText,
  generateSeoFileName,
} from "../../../utils/images/seoGenerator";

export default function SortableImageGrid({
  images,
  setImages,
  title,
  selectedCategory,
  removeImage,
  moveImage,
  isUploading,
  isSaving,
}) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const oldIndex = parseInt(active.id.replace("image-", ""), 10);
      const newIndex = parseInt(over.id.replace("image-", ""), 10);

      setImages((prevImages) => {
        const movedArray = arrayMove(prevImages, oldIndex, newIndex);
        return movedArray.map((img, index) => ({
          ...img,
          s3Path: generateSeoFileName(selectedCategory, title, index + 1),
          altText: generateSeoAltText(title, index + 1),
        }));
      });
    },
    [selectedCategory, title, setImages],
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <SortableContext
          items={images.map((_, i) => `image-${i}`)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <SortableImageItem
                key={`image-${index}`}
                id={`image-${index}`}
                image={image}
                index={index}
                totalImages={images.length}
                removeImage={() => removeImage(index)}
                moveImage={moveImage}
                setImages={setImages}
                productTitle={title}
                category={selectedCategory}
                isUploading={isUploading}
                isSaving={isSaving}
              />
            ))}
            {images.length > 0 && images.length % 4 !== 0 && (
              <AddImageButton variant="grid" setImages={setImages} />
            )}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: "0.5" } },
            }),
          }}
        >
          {activeId ? (
            <div className="z-50 scale-105 cursor-grabbing">
              <SortableImageItem
                image={images[parseInt(activeId.replace("image-", ""), 10)]}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {images.length > 0 && images.length % 4 === 0 && (
        <div className="mt-4">
          <AddImageButton variant="full-width" setImages={setImages} />
        </div>
      )}
    </>
  );
}
