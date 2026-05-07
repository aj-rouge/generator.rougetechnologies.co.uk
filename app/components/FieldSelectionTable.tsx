// components/UniversalImportModal/FieldSelectionTable.tsx
import { IMPORT_FIELDS } from "./header/import-product/UniversalImportModal";
import { ImageIcon } from "lucide-react";

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

// Helper: get display value for a field (for the dropdown and cell rendering)
function getFieldDisplayValue(source: ScrapedSource, fieldKey: string): any {
  if (fieldKey === "specifications")
    return source.specifications?.length
      ? `${source.specifications.length} specs`
      : null;
  if (fieldKey === "shipping") return source.shipping || null;
  if (fieldKey === "returns") return source.returns || null;
  if (fieldKey === "images") {
    const images = source.product.images;
    return images?.length ? images : null; // return array of URLs
  }
  return source.product[fieldKey] || null;
}

// Component to render image thumbnails
function ImagePreview({ urls }: { urls: string[] }) {
  const previewUrls = urls; // show first 3 images
  const remaining = urls.length - previewUrls.length;

  return (
    <div className="flex gap-1 items-center">
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
                "https://placehold.co/40x40?text=404";
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

// Component for rendering a cell value (non-image)
function TextCell({ value }: { value: any }) {
  if (value === null || value === undefined)
    return <span className="text-gray-400">—</span>;
  let displayValue: string;
  if (typeof value === "object") {
    displayValue = JSON.stringify(value);
  } else {
    displayValue = String(value);
  }
  return (
    <div className="max-w-xs truncate" title={displayValue}>
      {displayValue}
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
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Selected Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {IMPORT_FIELDS.map((field) => {
            // Collect available sources that have a value for this field
            const availableOptions: { idx: number; val: any }[] = [];
            sources.forEach((src, idx) => {
              const val = getFieldDisplayValue(src, field.key);
              if (val !== null && val !== undefined && val !== "") {
                availableOptions.push({ idx, val });
              }
            });
            if (availableOptions.length === 0) return null;

            const currentSelection = fieldSelections[field.key];
            return (
              <tr
                key={field.key}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {field.label}
                </td>
                {sources.map((src, idx) => {
                  const val = getFieldDisplayValue(src, field.key);
                  const hasValue =
                    val !== null && val !== undefined && val !== "";
                  return (
                    <td key={idx} className="px-4 py-3 align-middle">
                      {hasValue ? (
                        field.key === "images" && Array.isArray(val) ? (
                          <ImagePreview urls={val} />
                        ) : (
                          <TextCell value={val} />
                        )
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 align-middle">
                  <select
                    value={
                      currentSelection !== undefined ? currentSelection : ""
                    }
                    onChange={(e) =>
                      onFieldSelectionChange(
                        field.key,
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="p-1.5 border rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="" disabled>
                      Choose source
                    </option>
                    {availableOptions.map((opt) => (
                      <option key={opt.idx} value={opt.idx}>
                        Source {opt.idx + 1}:{" "}
                        {field.key === "images"
                          ? `${opt.val.length} images`
                          : typeof opt.val === "string"
                            ? opt.val.substring(0, 40)
                            : opt.val?.toString().substring(0, 40)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
