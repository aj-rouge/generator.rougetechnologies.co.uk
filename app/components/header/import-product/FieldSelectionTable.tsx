// components/UniversalImportModal/FieldSelectionTable.tsx
import { useState } from "react";
import { IMPORT_FIELDS } from "./UniversalImportModal";
import {
  ImageIcon,
  Circle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ScrapedSource {
  source: string;
  identifier: string;
  product: Record<string, any>;
  specifications?: any[];
  shipping?: any;
  returns?: any;
}

interface FieldSelectionTableProps {
  sources: ScrapedSource[];
  fieldSelections: Record<string, number>;
  onFieldSelectionChange: (fieldKey: string, sourceIndex: number) => void;
}

// Helper: get display value for a field (for the cell rendering)
function getFieldDisplayValue(source: ScrapedSource, fieldKey: string): any {
  if (fieldKey === "specifications")
    return source.specifications?.length
      ? `${source.specifications.length} specs`
      : null;
  if (fieldKey === "shipping") return source.shipping || null;
  if (fieldKey === "returns") return source.returns || null;
  if (fieldKey === "images") {
    const images = source.product.images;
    return images?.length ? images : null;
  }
  return source.product[fieldKey] || null;
}

// Component to render image thumbnails
function ImagePreview({ urls }: { urls: string[] }) {
  const previewUrls = urls;
  const remaining = urls.length - previewUrls.length;

  return (
    <div className="flex gap-1 items-center flex-wrap">
      {previewUrls.map((url, idx) => (
        <div
          key={idx}
          className="relative w-20 h-20 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 group"
        >
          <img
            src={url}
            alt={`Preview ${idx + 1}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/80x80?text=404";
            }}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">
          +{remaining}
        </div>
      )}
      {urls.length === 0 && (
        <div className="text-gray-400 text-xs flex items-center gap-1">
          <ImageIcon className="w-3 h-3" /> No images
        </div>
      )}
    </div>
  );
}

function ExpandableTextCell({ value }: { value: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }

  let fullText: string;
  if (typeof value === "object") {
    fullText = JSON.stringify(value, null, 2);
  } else {
    fullText = String(value);
  }

  const truncated =
    fullText.length > 100 ? fullText.slice(0, 100) + "…" : fullText;
  const displayText = isExpanded ? fullText : truncated;
  const isTruncatable = fullText.length > 100;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTruncatable) setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative max-w-3xl">
      {/* Text container - add bottom padding when collapsed to make room for overlay */}
      <div
        className={`text-black dark:text-white ${
          isExpanded
            ? "whitespace-pre-wrap break-words pb-0"
            : "whitespace-normal"
        }`}
        style={{ wordBreak: "break-word", maxWidth: "100%" }}
      >
        {displayText}
      </div>
      {isTruncatable && !isExpanded && (
        <button
          onClick={handleToggle}
          className="absolute bottom-0 left-0 right-0 flex justify-center items-center bg-gradient-to-t from-white to-transparent dark:from-gray-900/80 dark:to-transparent transition-all hover:opacity-80"
          title="Expand"
        >
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      )}
      {isTruncatable && isExpanded && (
        <button
          onClick={handleToggle}
          className="mt-1 flex justify-center items-center w-full py-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 transition-all"
          title="Collapse"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export function FieldSelectionTable({
  sources,
  fieldSelections,
  onFieldSelectionChange,
}: FieldSelectionTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
              Field
            </th>
            {sources.map((src, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
              >
                <span className="capitalize">{src.source}</span>
                <div className="text-xs text-gray-400 font-normal mt-1">
                  {src.identifier?.substring(0, 30)}
                  {src.identifier?.length > 30 ? "…" : ""}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {IMPORT_FIELDS.map((field) => {
            // Determine which sources have a valid value for this field
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

                  return (
                    <td key={idx} className="px-4 py-3 align-middle">
                      {hasValue ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() =>
                              onFieldSelectionChange(field.key, idx)
                            }
                            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity w-full"
                          >
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              {field.key === "images" && Array.isArray(val) ? (
                                <ImagePreview urls={val} />
                              ) : (
                                <ExpandableTextCell value={val} />
                              )}
                            </div>
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
