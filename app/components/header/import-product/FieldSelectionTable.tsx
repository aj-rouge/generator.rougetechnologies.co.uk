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
}

interface FieldSelectionTableProps {
  sources: ScrapedSource[];
  fieldSelections: Record<string, number | null>;
  onFieldSelectionChange: (
    fieldKey: string,
    sourceIndex: number | null,
  ) => void;
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
  if (value === null || value === undefined)
    return <span className="text-gray-400">—</span>;

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
      <div
        className={`text-black dark:text-white ${isExpanded ? "whitespace-pre-wrap break-words pb-0" : "whitespace-normal"}`}
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

function SpecificationsCell({ count, list }: { count: number; list: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };
  return (
    <div className="w-full">
      <div
        onClick={handleToggle}
        className="flex items-center justify-between gap-2 cursor-pointer select-none"
      >
        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
          {count} specs
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>
      {isOpen && (
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-60 overflow-y-auto pr-1">
            {list.map((spec, idx) => (
              <div key={idx} className="text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {spec.key}:
                </span>{" "}
                <span className="text-gray-600 dark:text-gray-400 break-words">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
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
                        onClick={() => {
                          if (isSelected) {
                            onFieldSelectionChange(field.key, null); // deselect
                          } else {
                            onFieldSelectionChange(field.key, idx);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isSelected) {
                              onFieldSelectionChange(field.key, null);
                            } else {
                              onFieldSelectionChange(field.key, idx);
                            }
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
                          {field.key === "images" && Array.isArray(val) ? (
                            <ImagePreview urls={val} />
                          ) : field.key === "specifications" &&
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
  );
}
