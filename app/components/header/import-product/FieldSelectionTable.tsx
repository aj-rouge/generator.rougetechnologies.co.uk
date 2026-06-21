// FieldSelectionTable.tsx (final)
import { useState } from "react";
import { IMPORT_FIELDS } from "./UniversalImportModal";
import { Circle, CheckCircle } from "lucide-react";
import { ExpandableTextCell } from "./ExpandableTextCell";
import { SpecificationsCell } from "./SpecificationsCell";
import { Lightbox } from "./Lightbox";
import { ImageSelectionCell } from "./ImageSelectionCell";

interface ScrapedSource {
  source: string;
  identifier: string;
  product: Record<string, any>;
  specifications?: any[];
}

interface FieldSelectionTableProps {
  sources: ScrapedSource[];
  fieldSelections: Record<string, any>;
  setFieldSelections: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  addNotification: (notification: any) => void;
}

function getFieldDisplayValue(source: ScrapedSource, fieldKey: string): any {
  if (fieldKey === "specifications")
    return source.specifications?.length
      ? { count: source.specifications.length, list: source.specifications }
      : null;
  if (fieldKey === "images") {
    const images = source.product.images;
    return images?.length ? images : null;
  }
  return source.product[fieldKey] || null;
}

export function FieldSelectionTable({
  sources,
  fieldSelections,
  setFieldSelections,
  addNotification,
}: FieldSelectionTableProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Helper: check if a source is fully selected for all fields (that have values)
  const isSourceFullySelected = (sourceIndex: number): boolean => {
    for (const field of IMPORT_FIELDS) {
      const source = sources[sourceIndex];
      if (!source) return false;
      const value = getFieldDisplayValue(source, field.key);
      const hasValue = value !== null && value !== undefined && value !== "";

      if (!hasValue) continue; // field not available, ignore

      if (field.key === "images") {
        const imagesSel = fieldSelections["images"] as {
          sourceIndex: number | null;
          selectedUrls: string[];
        };
        if (imagesSel?.sourceIndex !== sourceIndex) return false;
        // optionally check if all images are selected (up to 16)
        const allUrls = source.product.images?.slice(0, 16) || [];
        if (imagesSel?.selectedUrls?.length !== allUrls.length) return false;
      } else {
        if (fieldSelections[field.key] !== sourceIndex) return false;
      }
    }
    return true;
  };

  // Select all fields from a given source
  const selectAllFromSource = (sourceIndex: number) => {
    const newSelections: Record<string, any> = { ...fieldSelections };

    for (const field of IMPORT_FIELDS) {
      const source = sources[sourceIndex];
      if (!source) continue;
      const value = getFieldDisplayValue(source, field.key);
      const hasValue = value !== null && value !== undefined && value !== "";

      if (!hasValue) {
        // If the source has no value for this field, we leave the current selection unchanged
        continue;
      }

      if (field.key === "images") {
        const allUrls = source.product.images?.slice(0, 16) || [];
        newSelections["images"] = {
          sourceIndex,
          selectedUrls: allUrls,
        };
      } else {
        newSelections[field.key] = sourceIndex;
      }
    }

    setFieldSelections(newSelections);
  };

  // Clear all selections from a given source
  const clearAllFromSource = (sourceIndex: number) => {
    const newSelections: Record<string, any> = { ...fieldSelections };

    for (const field of IMPORT_FIELDS) {
      const source = sources[sourceIndex];
      if (!source) continue;
      const value = getFieldDisplayValue(source, field.key);
      const hasValue = value !== null && value !== undefined && value !== "";

      if (!hasValue) continue;

      if (field.key === "images") {
        const imagesSel = fieldSelections["images"] as {
          sourceIndex: number | null;
          selectedUrls: string[];
        };
        if (imagesSel?.sourceIndex === sourceIndex) {
          newSelections["images"] = { sourceIndex: null, selectedUrls: [] };
        }
      } else {
        if (fieldSelections[field.key] === sourceIndex) {
          newSelections[field.key] = null;
        }
      }
    }

    setFieldSelections(newSelections);
  };

  const handleToggleSelectAll = (sourceIndex: number) => {
    if (isSourceFullySelected(sourceIndex)) {
      clearAllFromSource(sourceIndex);
    } else {
      selectAllFromSource(sourceIndex);
    }
  };

  const handleRadioSelection = (
    fieldKey: string,
    sourceIndex: number | null,
  ) => {
    setFieldSelections((prev) => ({
      ...prev,
      [fieldKey]: sourceIndex,
    }));
  };

  const handleImagesSelectionChange = (
    sourceIndex: number | null,
    selectedUrls: string[],
  ) => {
    setFieldSelections((prev) => ({
      ...prev,
      images: { sourceIndex, selectedUrls },
    }));
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                Field
              </th>
              {sources.map((src, idx) => {
                const isFullySelected = isSourceFullySelected(idx);
                return (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      {/* Toggle icon: Circle or CheckCircle */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(idx)}
                        className="focus:outline-none"
                        aria-label={
                          isFullySelected
                            ? "Deselect all fields from this source"
                            : "Select all fields from this source"
                        }
                      >
                        {isFullySelected ? (
                          <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                      <div>
                        <span className="capitalize">{src.source}</span>
                        <div className="text-xs text-gray-400 font-normal mt-0.5">
                          {src.identifier?.substring(0, 30)}
                          {src.identifier?.length > 30 ? "…" : ""}
                        </div>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {IMPORT_FIELDS.map((field) => {
              // Special handling for images field
              if (field.key === "images") {
                const currentSelection = (fieldSelections["images"] as {
                  sourceIndex: number | null;
                  selectedUrls: string[];
                }) || { sourceIndex: null, selectedUrls: [] };

                return (
                  <tr
                    key="images"
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap align-top">
                      {field.label}
                    </td>
                    {sources.map((src, idx) => {
                      const isSelected = currentSelection.sourceIndex === idx;
                      const selectedUrls = isSelected
                        ? currentSelection.selectedUrls
                        : [];

                      const handleSelectSource = () => {
                        if (isSelected) {
                          handleImagesSelectionChange(null, []);
                        } else {
                          const allUrls =
                            src.product.images?.slice(0, 16) || [];
                          handleImagesSelectionChange(idx, allUrls);
                        }
                      };

                      const toggleImage = (url: string) => {
                        if (!isSelected) return;
                        let newSelected: string[];
                        if (selectedUrls.includes(url)) {
                          newSelected = selectedUrls.filter((u) => u !== url);
                        } else {
                          if (selectedUrls.length >= 16) {
                            addNotification({
                              message: "You can select up to 16 images only.",
                              type: "warning",
                            });
                            return;
                          }
                          newSelected = [...selectedUrls, url];
                        }
                        handleImagesSelectionChange(idx, newSelected);
                      };

                      const selectAll = () => {
                        if (!isSelected) return;
                        const allUrls = src.product.images?.slice(0, 16) || [];
                        handleImagesSelectionChange(idx, allUrls);
                      };

                      const deselectAll = () => {
                        if (!isSelected) return;
                        handleImagesSelectionChange(idx, []);
                      };

                      return (
                        <td key={idx} className="px-4 py-3 align-top">
                          <ImageSelectionCell
                            source={src}
                            sourceIndex={idx}
                            isSelected={isSelected}
                            selectedUrls={selectedUrls}
                            onSelectSource={handleSelectSource}
                            onToggleImage={toggleImage}
                            onSelectAll={selectAll}
                            onDeselectAll={deselectAll}
                            onOpenLightbox={openLightbox}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              // Standard radio selection for other fields
              const availableSources: { idx: number; val: any }[] = [];
              sources.forEach((src, idx) => {
                const val = getFieldDisplayValue(src, field.key);
                if (val !== null && val !== undefined && val !== "") {
                  availableSources.push({ idx, val });
                }
              });
              if (availableSources.length === 0) return null;

              const currentSelection = fieldSelections[field.key];

              return (
                <tr
                  key={field.key}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {field.label}
                  </td>
                  {sources.map((src, idx) => {
                    const val = getFieldDisplayValue(src, field.key);
                    const hasValue =
                      val !== null && val !== undefined && val !== "";
                    const isSelected = currentSelection === idx;

                    if (!hasValue) {
                      return (
                        <td
                          key={idx}
                          className="px-4 py-3 align-middle text-gray-300 dark:text-gray-600"
                        >
                          —
                        </td>
                      );
                    }

                    return (
                      <td key={idx} className="px-4 py-3 align-middle">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            handleRadioSelection(
                              field.key,
                              isSelected ? null : idx,
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRadioSelection(
                                field.key,
                                isSelected ? null : idx,
                              );
                            }
                          }}
                          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity w-full cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            {field.key === "specifications" &&
                            typeof val === "object" &&
                            val.list ? (
                              <SpecificationsCell
                                count={val.count}
                                list={val.list}
                              />
                            ) : (
                              <ExpandableTextCell value={val} />
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lightboxOpen && (
        <Lightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
