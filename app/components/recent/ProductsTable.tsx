"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Box,
  Layers,
  AlignLeft,
  ListTree,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";
import { CopyToClipboard } from "../CopyToClipboard";
import { NoteTooltip } from "./NoteTooltip";
import { useState, useRef, useEffect, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
interface ProductsTableProps {
  products: any[];
  sortField: string;
  sortOrder: "ASC" | "DESC";
  onSort: (field: string) => void;
  formatDate: (ts: number) => string;
  categoryNameMap: Map<string, string>;
  selectionMode: boolean;
  selectedIds: Set<string | number>;
  onToggleProduct: (id: string | number) => void;
}

// ─── helpers ───────────────────────────────────────────────
const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return (
      trimmed !== "" && !["null", "NULL", "undefined", "none"].includes(trimmed)
    );
  }
  return true;
};

const formatPrice = (price: number | null | undefined) =>
  price != null ? `€${Number(price).toFixed(2)}` : "—";

const formatWeight = (weight: number | null | undefined) =>
  weight != null ? `${Number(weight).toFixed(1)} kg` : "—";

// ─── tooltip hook ──────────────────────────────────────────
const useTooltip = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };
  return { isOpen, handleMouseEnter, handleMouseLeave };
};

// ─── inline cell renderers ─────────────────────────────────
const ITEM_WIDTHS = {
  spec: 60,
  feature: 70,
  feedback: 50,
  paragraph: 8,
};

const CellImages = ({ images }: { images: any[] }) => {
  const { isOpen, handleMouseEnter, handleMouseLeave } = useTooltip();
  const validImages = images.filter(
    (img) => img?.url && typeof img.url === "string" && img.url.trim() !== "",
  );
  if (validImages.length === 0) return <span className="text-gray-300">—</span>;

  const preview = validImages.slice(0, 3);
  const extra = validImages.length - 3;

  return (
    <div
      className="relative flex items-center gap-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {preview.map((img, i) => (
        <div
          key={i}
          className="relative w-6 h-6 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 flex-shrink-0"
        >
          <Image
            src={img.url}
            alt={img.alt_text || ""}
            fill
            className="object-contain"
            sizes="24px"
          />
        </div>
      ))}
      {extra > 0 && (
        <span className="text-xs text-gray-400 ml-1">+{extra}</span>
      )}
      {isOpen && (
        <div className="absolute z-20 bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs max-h-48 overflow-y-auto">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Images
          </div>
          <div className="flex flex-wrap gap-1">
            {validImages.map((img, i) => (
              <div
                key={i}
                className="relative w-12 h-12 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900"
              >
                <Image
                  src={img.url}
                  alt={img.alt_text || ""}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CellSpecs = ({ specs, maxWidth }: { specs: any[]; maxWidth: number }) => {
  const { isOpen, handleMouseEnter, handleMouseLeave } = useTooltip();
  if (!specs || specs.length === 0)
    return <span className="text-gray-300">—</span>;

  const available = maxWidth - 30;
  const maxItems = Math.max(1, Math.floor(available / ITEM_WIDTHS.spec));
  const visible = specs.slice(0, maxItems);
  const extra = specs.length - visible.length;

  return (
    <div
      className="relative overflow-hidden text-ellipsis whitespace-nowrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {visible
          .map((spec: any, i) => {
            const [key, value] = Array.isArray(spec)
              ? spec
              : [spec.key, spec.value];
            return `${key}:${value}`;
          })
          .join(" • ")}
      </span>
      {extra > 0 && (
        <span className="text-gray-400 text-xs ml-1">+{extra}</span>
      )}
      {isOpen && (
        <div className="absolute z-20 bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Specifications
          </div>
          <ul className="space-y-0.5">
            {specs.map((spec: any, i) => {
              const [key, value] = Array.isArray(spec)
                ? spec
                : [spec.key, spec.value];
              return (
                <li
                  key={i}
                  className="flex justify-between gap-2 py-0.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                >
                  <span className="text-gray-600 dark:text-gray-400 truncate">
                    {key}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 font-mono truncate max-w-[60%]">
                    {value}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const CellParagraphs = ({
  paragraphs,
  maxWidth,
}: {
  paragraphs: string[];
  maxWidth: number;
}) => {
  const { isOpen, handleMouseEnter, handleMouseLeave } = useTooltip();
  if (!paragraphs || paragraphs.length === 0)
    return <span className="text-gray-300">—</span>;

  const maxChars = Math.max(
    20,
    Math.floor((maxWidth - 30) / ITEM_WIDTHS.paragraph),
  );
  let displayText = "";
  let extraCount = 0;

  let totalChars = 0;
  let shown = 0;
  for (const p of paragraphs) {
    const len = p.length;
    if (totalChars + len + (shown > 0 ? 3 : 0) <= maxChars) {
      totalChars += len + (shown > 0 ? 3 : 0);
      shown++;
      displayText += (shown > 1 ? " • " : "") + p;
    } else {
      break;
    }
  }

  if (shown === 0) {
    const first = paragraphs[0] || "";
    displayText = first.slice(0, maxChars) + "…";
    extraCount = paragraphs.length - 1;
  } else {
    extraCount = paragraphs.length - shown;
  }

  return (
    <div
      className="relative overflow-hidden text-ellipsis whitespace-nowrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {displayText}
      </span>
      {extraCount > 0 && (
        <span className="text-gray-400 text-xs ml-1">+{extraCount}</span>
      )}
      {isOpen && (
        <div className="absolute z-20 bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Paragraphs ({paragraphs.length})
          </div>
          <ul className="space-y-1">
            {paragraphs.map((p, i) => (
              <li
                key={i}
                className="text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/50 py-0.5"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const CellFeatures = ({
  features,
  maxWidth,
}: {
  features: any[];
  maxWidth: number;
}) => {
  const { isOpen, handleMouseEnter, handleMouseLeave } = useTooltip();
  if (!features || features.length === 0)
    return <span className="text-gray-300">—</span>;

  const available = maxWidth - 30;
  const maxItems = Math.max(1, Math.floor(available / ITEM_WIDTHS.feature));
  const visible = features.slice(0, maxItems);
  const extra = features.length - visible.length;

  return (
    <div
      className="relative overflow-hidden text-ellipsis whitespace-nowrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {visible.map((f) => f.title).join(" • ")}
      </span>
      {extra > 0 && (
        <span className="text-gray-400 text-xs ml-1">+{extra}</span>
      )}
      {isOpen && (
        <div className="absolute z-20 bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Features ({features.length})
          </div>
          <ul className="space-y-1">
            {features.map((f, i) => (
              <li
                key={i}
                className="border-b border-gray-100 dark:border-gray-700/50 py-0.5"
              >
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {f.title}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {f.description}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const CellFeedbacks = ({
  feedbacks,
  maxWidth,
}: {
  feedbacks: any[];
  maxWidth: number;
}) => {
  const { isOpen, handleMouseEnter, handleMouseLeave } = useTooltip();
  if (!feedbacks || feedbacks.length === 0)
    return <span className="text-gray-300">—</span>;

  const available = maxWidth - 30;
  const maxItems = Math.max(1, Math.floor(available / ITEM_WIDTHS.feedback));
  const visible = feedbacks.slice(0, maxItems);
  const extra = feedbacks.length - visible.length;

  return (
    <div
      className="relative overflow-hidden text-ellipsis whitespace-nowrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {visible.map((f) => `${f.name} (${f.count})`).join(" • ")}
      </span>
      {extra > 0 && (
        <span className="text-gray-400 text-xs ml-1">+{extra}</span>
      )}
      {isOpen && (
        <div className="absolute z-20 bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Feedbacks ({feedbacks.length})
          </div>
          <ul className="space-y-1">
            {feedbacks.map((f, i) => (
              <li
                key={i}
                className="border-b border-gray-100 dark:border-gray-700/50 py-0.5"
              >
                <div className="flex justify-between">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {f.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    count: {f.count}
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {f.content}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── Condition Badge ──────────────────────────────────────
const ConditionBadge = ({ condition }: { condition: string }) => {
  if (!isValidValue(condition)) return null;
  const normalized = condition.toLowerCase().trim();
  const colorMap: Record<string, string> = {
    new: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50",
    used: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50",
    refurbished:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
    "seller refurbished":
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50",
    "certified refurbished":
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800/50",
    "certified - refurbished":
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800/50",
    "excellent - refurbished":
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50",
    "very good - refurbished":
      "bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-800/50",
    "good - refurbished":
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50",
    "opened - never used":
      "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/50",
    "for parts or not working":
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50",
    "new other":
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700",
  };
  let colorClass = colorMap[normalized];
  if (!colorClass) {
    if (normalized.includes("refurbished"))
      colorClass = colorMap["refurbished"];
    else if (normalized.includes("new")) colorClass = colorMap["new"];
    else if (normalized.includes("used")) colorClass = colorMap["used"];
    else if (normalized.includes("parts") || normalized.includes("not working"))
      colorClass = colorMap["for parts or not working"];
    else
      colorClass =
        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700";
  }
  return (
    <span
      className={`inline-flex items-center px-2 rounded-xl border text-[10px] font-medium ${colorClass}`}
    >
      {condition}
    </span>
  );
};

// ─── CopyBadge ─────────────────────────────────────────────
const CopyBadge = ({
  value,
  variant = "default",
}: {
  value: string | number;
  variant?: "blue" | "gray" | "green" | "orange" | "default";
}) => {
  const stringValue = String(value);
  const displayValue = stringValue.includes("/")
    ? stringValue.split("/").pop()
    : stringValue;
  const variants = {
    blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
    gray: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700",
    green:
      "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50",
    orange:
      "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50",
    default:
      "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50",
  };
  return (
    <CopyToClipboard
      value={stringValue}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-all active:scale-95 ${
        variants[variant] || variants.default
      }`}
      showIcon={true}
      iconSize={10}
      successMessage={`${stringValue} copied`}
    >
      <span className="font-mono truncate max-w-[60px]">{displayValue}</span>
    </CopyToClipboard>
  );
};

// ─── Column resize hook (fixed) ──────────────────────────
const STORAGE_KEY = "products-table-column-widths";
const MIN_WIDTH = 40;
const DEFAULT_WIDTHS: Record<string, number> = {
  select: 32,
  image: 48,
  title: 150,
  sku: 100,
  ean: 120,
  asin: 120,
  bl: 80,
  sh: 80,
  category: 120,
  condition: 100,
  note: 120,
  price: 80,
  rrp: 80,
  weight: 80,
  qty: 60,
  shipping: 100,
  updated: 120,
  created: 120,
  images: 120,
  specs: 200,
  paragraphs: 200,
  features: 200,
  feedbacks: 200,
  detail: 40,
};

type Widths = Record<string, number>;

function useColumnResize(selectionMode: boolean) {
  const loadWidths = (): Widths => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_WIDTHS, ...parsed };
      }
    } catch (_) {}
    return { ...DEFAULT_WIDTHS };
  };

  const [widths, setWidths] = useState<Widths>(loadWidths);
  const widthsRef = useRef(widths);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  const saveWidths = useCallback((newWidths: Widths) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidths));
    } catch (_) {}
  }, []);

  useEffect(() => {
    setWidths((prev) => {
      const updated = { ...prev };
      if (selectionMode && !updated.select) {
        updated.select = 32;
      } else if (!selectionMode) {
        delete updated.select;
      }
      saveWidths(updated);
      return updated;
    });
  }, [selectionMode, saveWidths]);

  const getWidth = (key: string) => widths[key] ?? DEFAULT_WIDTHS[key] ?? 100;

  const ResizeHandle = ({ columnKey }: { columnKey: string }) => {
    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = getWidth(columnKey);
      let rafId: number | null = null;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          const delta = moveEvent.clientX - startX;
          const newWidth = Math.max(MIN_WIDTH, startWidth + delta);
          setWidths((prev) => ({ ...prev, [columnKey]: newWidth }));
          rafId = null;
        });
      };

      const onMouseUp = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        saveWidths(widthsRef.current);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    return (
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
        onMouseDown={handleMouseDown}
        style={{ zIndex: 10 }}
      />
    );
  };

  return { getWidth, ResizeHandle };
}

// ─── Main Table ────────────────────────────────────────────
export function ProductsTable({
  products,
  sortField,
  sortOrder,
  onSort,
  formatDate,
  categoryNameMap,
  selectionMode,
  selectedIds,
  onToggleProduct,
}: ProductsTableProps) {
  const { getWidth, ResizeHandle } = useColumnResize(selectionMode);

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 text-xs">{sortOrder === "ASC" ? "↑" : "↓"}</span>
    );
  };

  const SortableHeader = ({
    field,
    columnKey,
    children,
    className = "",
    hideOn = "",
  }: {
    field: string;
    columnKey: string;
    children: React.ReactNode;
    className?: string;
    hideOn?: string;
  }) => {
    const width = getWidth(columnKey);
    return (
      <th
        scope="col"
        className={`px-2 py-3 cursor-pointer hover:text-blue-600 transition-colors relative ${className} ${hideOn}`}
        style={{ width: `${width}px`, minWidth: `${MIN_WIDTH}px` }}
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1 whitespace-nowrap">
          {children}
          {renderSortIndicator(field)}
        </div>
        <ResizeHandle columnKey={columnKey} />
      </th>
    );
  };

  const StaticHeader = ({
    columnKey,
    children,
    className = "",
    hideOn = "",
  }: {
    columnKey: string;
    children: React.ReactNode;
    className?: string;
    hideOn?: string;
  }) => {
    const width = getWidth(columnKey);
    return (
      <th
        scope="col"
        className={`px-2 py-3 relative ${className} ${hideOn}`}
        style={{ width: `${width}px`, minWidth: `${MIN_WIDTH}px` }}
      >
        {children}
        <ResizeHandle columnKey={columnKey} />
      </th>
    );
  };

  const DataCell = ({
    columnKey,
    children,
    className = "",
    hideOn = "",
  }: {
    columnKey: string;
    children: (width: number) => React.ReactNode;
    className?: string;
    hideOn?: string;
  }) => {
    const width = getWidth(columnKey);
    return (
      <td
        className={`px-2 py-2 ${className} ${hideOn}`}
        style={{ width: `${width}px`, minWidth: `${MIN_WIDTH}px` }}
      >
        {children(width)}
      </td>
    );
  };

  // ─── Row renderer for virtualization ──────────────────────
  const renderRow = (product: any) => {
    const isSelected = selectedIds.has(product.id);
    const categoryName = product.category_slug
      ? categoryNameMap.get(product.category_slug)
      : undefined;
    const firstImage =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]?.url
        : undefined;
    const hasNote =
      product.note &&
      product.note !== "null" &&
      product.note !== "NULL" &&
      product.note.toString().trim().length > 0;

    const images = Array.isArray(product.images) ? product.images : [];
    const specs = Array.isArray(product.specifications)
      ? product.specifications
      : [];
    const paragraphs = Array.isArray(product.paragraphs)
      ? product.paragraphs
      : [];
    const features = Array.isArray(product.features) ? product.features : [];
    const feedbacks = Array.isArray(product.feedbacks) ? product.feedbacks : [];

    const validFirstImage =
      firstImage && typeof firstImage === "string" && firstImage.trim() !== ""
        ? firstImage
        : undefined;

    return (
      <tr
        key={product.id}
        className={`transition-colors ${selectionMode ? "cursor-pointer" : ""} ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-900/10"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
        onClick={() => selectionMode && onToggleProduct(product.id)}
      >
        {selectionMode && (
          <DataCell columnKey="select">
            {() => (
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            )}
          </DataCell>
        )}

        <DataCell columnKey="image">
          {() => (
            <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              {validFirstImage ? (
                <Image
                  src={validFirstImage}
                  alt={product.title}
                  fill
                  className="object-contain"
                  sizes="40px"
                />
              ) : (
                <Box className="w-full h-full p-1 text-gray-300 dark:text-gray-600" />
              )}
            </div>
          )}
        </DataCell>

        <DataCell columnKey="title" className="max-w-[150px]">
          {() => (
            <div className="flex items-center gap-1 overflow-hidden">
              <Link
                href={`/products/${product.id}`}
                className="font-medium text-gray-900 dark:text-gray-100 truncate hover:text-blue-600"
              >
                {product.title}
              </Link>
              {hasNote && <NoteTooltip note={product.note} />}
              <CopyToClipboard
                value={product.title}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                successMessage="Title copied"
                iconSize={12}
              />
            </div>
          )}
        </DataCell>

        <DataCell columnKey="sku" hideOn="hidden sm:table-cell">
          {() =>
            isValidValue(product.sku) ? (
              <CopyBadge value={product.sku} variant="orange" />
            ) : null
          }
        </DataCell>
        <DataCell columnKey="ean" hideOn="hidden md:table-cell">
          {() =>
            isValidValue(product.ean) ? (
              <CopyBadge value={product.ean} variant="default" />
            ) : null
          }
        </DataCell>
        <DataCell columnKey="asin" hideOn="hidden lg:table-cell">
          {() =>
            isValidValue(product.asin) ? (
              <CopyBadge value={product.asin} variant="default" />
            ) : null
          }
        </DataCell>
        <DataCell columnKey="bl" hideOn="hidden xl:table-cell">
          {() =>
            isValidValue(product.baselinker_id) ? (
              <CopyBadge value={product.baselinker_id} variant="blue" />
            ) : null
          }
        </DataCell>
        <DataCell columnKey="sh" hideOn="hidden xl:table-cell">
          {() =>
            isValidValue(product.shopify_id) ? (
              <CopyBadge value={product.shopify_id} variant="green" />
            ) : null
          }
        </DataCell>
        <DataCell
          columnKey="category"
          hideOn="hidden lg:table-cell"
          className="truncate max-w-[100px]"
        >
          {() => categoryName || "—"}
        </DataCell>
        <DataCell columnKey="condition" hideOn="hidden 2xl:table-cell">
          {() => <ConditionBadge condition={product.product_condition} />}
        </DataCell>
        <DataCell columnKey="note" hideOn="hidden 2xl:table-cell">
          {() =>
            hasNote ? (
              <NoteTooltip note={product.note} />
            ) : (
              <span className="text-gray-300 dark:text-gray-600">—</span>
            )
          }
        </DataCell>
        <DataCell columnKey="price" hideOn="hidden 2xl:table-cell">
          {() => formatPrice(product.price_brutto)}
        </DataCell>
        <DataCell columnKey="rrp" hideOn="hidden 3xl:table-cell">
          {() => formatPrice(product.rrp)}
        </DataCell>
        <DataCell columnKey="weight" hideOn="hidden 3xl:table-cell">
          {() => formatWeight(product.weight)}
        </DataCell>
        <DataCell columnKey="qty" hideOn="hidden 2xl:table-cell">
          {() => product.quantity ?? "—"}
        </DataCell>
        <DataCell columnKey="shipping" hideOn="hidden 3xl:table-cell">
          {() =>
            isValidValue(product.shipping_method)
              ? product.shipping_method
              : "—"
          }
        </DataCell>
        <DataCell
          columnKey="updated"
          className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400"
        >
          {() => formatDate(product.updated_at)}
        </DataCell>
        <DataCell
          columnKey="created"
          hideOn="hidden 3xl:table-cell"
          className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400"
        >
          {() => formatDate(product.created_at)}
        </DataCell>

        {/* Inline content cells */}
        <DataCell columnKey="images" hideOn="hidden xl:table-cell">
          {() => <CellImages images={images} />}
        </DataCell>
        <DataCell columnKey="specs" hideOn="hidden xl:table-cell">
          {(width) => <CellSpecs specs={specs} maxWidth={width} />}
        </DataCell>
        <DataCell columnKey="paragraphs" hideOn="hidden xl:table-cell">
          {(width) => (
            <CellParagraphs paragraphs={paragraphs} maxWidth={width} />
          )}
        </DataCell>
        <DataCell columnKey="features" hideOn="hidden xl:table-cell">
          {(width) => <CellFeatures features={features} maxWidth={width} />}
        </DataCell>
        <DataCell columnKey="feedbacks" hideOn="hidden xl:table-cell">
          {(width) => <CellFeedbacks feedbacks={feedbacks} maxWidth={width} />}
        </DataCell>

        <DataCell columnKey="detail">
          {() => (
            <Link
              href={`/products/${product.id}`}
              className="text-gray-400 hover:text-blue-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </DataCell>
      </tr>
    );
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="relative">
        {/* Table header – fixed, non‑virtualized */}
        <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300 table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/90 backdrop-blur-sm text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
            <tr>
              {selectionMode && (
                <StaticHeader columnKey="select" hideOn="" className="w-8">
                  <span className="sr-only">Select</span>
                </StaticHeader>
              )}
              <StaticHeader columnKey="image" hideOn="" className="w-10">
                Image
              </StaticHeader>
              <SortableHeader
                field="title"
                columnKey="title"
                className="min-w-[120px]"
              >
                Title
              </SortableHeader>
              <SortableHeader
                field="sku"
                columnKey="sku"
                hideOn="hidden sm:table-cell"
              >
                SKU
              </SortableHeader>
              <SortableHeader
                field="ean"
                columnKey="ean"
                hideOn="hidden md:table-cell"
              >
                EAN
              </SortableHeader>
              <SortableHeader
                field="asin"
                columnKey="asin"
                hideOn="hidden lg:table-cell"
              >
                ASIN
              </SortableHeader>
              <SortableHeader
                field="baselinker_id"
                columnKey="bl"
                hideOn="hidden xl:table-cell"
              >
                BL
              </SortableHeader>
              <SortableHeader
                field="shopify_id"
                columnKey="sh"
                hideOn="hidden xl:table-cell"
              >
                SH
              </SortableHeader>
              <SortableHeader
                field="category"
                columnKey="category"
                hideOn="hidden lg:table-cell"
              >
                Category
              </SortableHeader>
              <SortableHeader
                field="product_condition"
                columnKey="condition"
                hideOn="hidden 2xl:table-cell"
              >
                Condition
              </SortableHeader>
              <StaticHeader columnKey="note" hideOn="hidden 2xl:table-cell">
                Note
              </StaticHeader>
              <SortableHeader
                field="price_brutto"
                columnKey="price"
                hideOn="hidden 2xl:table-cell"
              >
                Price
              </SortableHeader>
              <SortableHeader
                field="rrp"
                columnKey="rrp"
                hideOn="hidden 3xl:table-cell"
              >
                RRP
              </SortableHeader>
              <SortableHeader
                field="weight"
                columnKey="weight"
                hideOn="hidden 3xl:table-cell"
              >
                Weight
              </SortableHeader>
              <SortableHeader
                field="quantity"
                columnKey="qty"
                hideOn="hidden 2xl:table-cell"
              >
                Qty
              </SortableHeader>
              <SortableHeader
                field="shipping_method"
                columnKey="shipping"
                hideOn="hidden 3xl:table-cell"
              >
                Shipping
              </SortableHeader>
              <SortableHeader field="updated_at" columnKey="updated">
                Updated
              </SortableHeader>
              <SortableHeader
                field="created_at"
                columnKey="created"
                hideOn="hidden 3xl:table-cell"
              >
                Created
              </SortableHeader>
              <StaticHeader columnKey="images" hideOn="hidden xl:table-cell">
                Images
              </StaticHeader>
              <StaticHeader columnKey="specs" hideOn="hidden xl:table-cell">
                Specs
              </StaticHeader>
              <StaticHeader
                columnKey="paragraphs"
                hideOn="hidden xl:table-cell"
              >
                Paragraphs
              </StaticHeader>
              <StaticHeader columnKey="features" hideOn="hidden xl:table-cell">
                Features
              </StaticHeader>
              <StaticHeader columnKey="feedbacks" hideOn="hidden xl:table-cell">
                Feedbacks
              </StaticHeader>
              <StaticHeader columnKey="detail" hideOn="" className="w-8">
                <span className="sr-only">Detail</span>
              </StaticHeader>
            </tr>
          </thead>
        </table>

        {/* Virtualized body – only rows visible in viewport */}
        <div className="h-[600px]">
          <Virtuoso
            style={{ height: "100%" }}
            totalCount={products.length}
            itemContent={(index) => renderRow(products[index])}
          />
        </div>
      </div>
    </div>
  );
}
