import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Calendar,
  ChevronRight,
  ListTree,
  AlignLeft,
  Image as ImageIcon,
  Box,
  FileText,
  Clipboard,
} from "lucide-react";
import { NoteTooltip } from "./NoteTooltip";
import { CopyToClipboard } from "../CopyToClipboard";

interface ProductCardProps {
  product: any;
  index: number;
  sortField: string;
  formatDate: (ts: number) => string;
  categoryNameMap: Map<string, string>;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
}

export const ProductCard = ({
  product,
  index,
  sortField,
  formatDate,
  categoryNameMap,
  selectionMode = false,
  isSelected = false,
  onToggle,
}: ProductCardProps) => {
  const categoryName = product.category_slug
    ? categoryNameMap.get(product.category_slug)
    : undefined;

  const parseJson = (data: any) => {
    if (!data) return [];
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return data;
  };

  const paragraphs = parseJson(product.paragraphs);
  const features = parseJson(product.features);
  const images = parseJson(product.images);
  const specifications = parseJson(product.specifications);

  const paragraphCount = paragraphs.length;
  const featureCount = features.length;
  const imageCount = images.length;
  const specCount = specifications.length;

  const firstImageUrl = images[0]?.url;

  const hasNote =
    product.note &&
    product.note !== "null" &&
    product.note !== "NULL" &&
    product.note.toString().trim().length > 0;

  // Helper to check if a field has a meaningful value (not null, undefined, or placeholder strings)
  const isValidValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return (
        trimmed !== "" &&
        !["null", "NULL", "undefined", "none"].includes(trimmed)
      );
    }
    return true; // numbers, booleans, etc. are valid
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`group relative bg-white dark:bg-gray-800 border rounded-xl transition-all shadow-sm hover:shadow-md ${
        selectionMode ? "cursor-pointer" : ""
      } ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20"
          : "border-gray-200 dark:border-gray-700"
      }`}
      onClick={() => selectionMode && onToggle?.()}
    >
      <div className="flex items-start p-3 sm:p-4 gap-3">
        {selectionMode && (
          <div className="flex-shrink-0 pt-1">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-blue-500 border-blue-500"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              }`}
            >
              {isSelected && (
                <svg
                  className="w-3 h-3 text-white"
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
          </div>
        )}
        {/* Image */}
        <Link
          href={`/products/${product.id}`}
          className="my-auto flex-shrink-0"
        >
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900">
            {firstImageUrl ? (
              <Image
                src={firstImageUrl}
                alt={product.title}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 80px, 96px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-3">
                <Box className="w-full h-full text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>
        </Link>

        {/* Right content */}
        <div className="flex flex-col gap-2 flex-grow min-w-0">
          {/* Category + Note row */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {categoryName || "Uncategorized"}
            </div>
            {hasNote && <NoteTooltip note={product.note} />}
          </div>

          {/* Title row with copy and duplicate buttons */}
          <div className="flex items-center justify-between gap-1">
            <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 hover:text-blue-600 transition-colors text-sm sm:text-base">
                {product.title}
              </h3>
            </Link>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <CopyToClipboard
                value={product.title}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                successMessage="Title copied"
                iconSize={14}
              />
              <Link
                href={`/create?duplicate=${product.id}`}
                className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                title="Duplicate product"
              >
                <Clipboard className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* ID badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 items-center">
            {isValidValue(product.sku) && (
              <CopyBadge label="SKU" value={product.sku} variant="orange" />
            )}
            {isValidValue(product.baselinker_id) && (
              <CopyBadge
                label="BL"
                value={product.baselinker_id}
                variant="blue"
              />
            )}
            {isValidValue(product.shopify_id) && (
              <CopyBadge
                label="SH"
                value={product.shopify_id}
                variant="green"
              />
            )}
            {isValidValue(product.id) && (
              <CopyBadge
                label="ID"
                value={product.id.toString()}
                variant="gray"
              />
            )}
            {isValidValue(product.asin) && (
              <CopyBadge label="ASIN" value={product.asin} variant="default" />
            )}
            {isValidValue(product.ean) && (
              <CopyBadge label="EAN" value={product.ean} variant="default" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <StatItem
                icon={<ListTree className="w-3 h-3" />}
                label="Features"
                count={featureCount}
                color="text-emerald-600"
              />
              <StatItem
                icon={<AlignLeft className="w-3 h-3" />}
                label="Paragraphs"
                count={paragraphCount}
                color="text-amber-600"
              />
              <StatItem
                icon={<ImageIcon className="w-3 h-3" />}
                label="Media"
                count={imageCount}
                color="text-purple-600"
              />
              <StatItem
                icon={<FileText className="w-3 h-3" />}
                label="Specs"
                count={specCount}
                color="text-slate-600 dark:text-slate-400"
              />
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                {sortField === "updated_at" ? (
                  <Clock className="w-3 h-3" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                <span>
                  {formatDate(
                    sortField === "updated_at"
                      ? product.updated_at
                      : product.created_at,
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Arrow */}
        <Link
          href={`/products/${product.id}`}
          className="border-l border-gray-50 dark:border-gray-700/50 self-center"
        >
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </motion.div>
  );
};

const CopyBadge = ({
  label,
  value,
  variant = "gray",
}: {
  label: string;
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
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-all active:scale-95 ${
        variants[variant] || variants.default
      }`}
      showIcon={true}
      iconSize={10}
      successMessage={`${label} copied`}
    >
      <span className="opacity-60 font-bold border-r pr-1 border-current/20">
        {label}
      </span>
      <span className="font-mono truncate max-w-[60px] sm:max-w-[80px]">
        {displayValue}
      </span>
    </CopyToClipboard>
  );
};

const StatItem = ({ icon, label, count, color }: any) => (
  <div
    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 ${color}`}
  >
    {icon}
    <span className="text-[10px] font-bold">{count}</span>
    <span className="hidden sm:inline text-[9px] uppercase tracking-wider opacity-70 font-medium">
      {label}
    </span>
  </div>
);
