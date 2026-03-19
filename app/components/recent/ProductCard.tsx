import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Clock,
  Calendar,
  ChevronRight,
  ListTree,
  AlignLeft,
  Image as ImageIcon,
  Box,
  Copy,
  Check,
  StickyNote,
} from "lucide-react";

interface ProductCardProps {
  product: any;
  index: number;
  sortField: string;
  formatDate: (ts: number) => string;
}

export const ProductCard = ({
  product,
  index,
  sortField,
  formatDate,
}: ProductCardProps) => {
  // Fallback formatter in case category_name isn't available
  const formatCategorySlug = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper to parse JSON strings from D1 View into arrays
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

  const paragraphCount = paragraphs.length;
  const featureCount = features.length;
  const imageCount = images.length;

  // Use the prioritized URL from the SQL view
  const firstImageUrl = images[0]?.url;

  // Strict check for note content
  const hasNote =
    product.note &&
    product.note !== "null" &&
    product.note !== "NULL" &&
    product.note.toString().trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md overflow-hidden"
    >
      <div className="flex items-center p-4">
        {/* Left: Image */}
        <Link href={`/products/${product.id}`} className="flex-shrink-0">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900">
            {firstImageUrl ? (
              <Image
                src={firstImageUrl}
                alt={product.title}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-300"
                sizes="96px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-3">
                <Box className="w-full h-full text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>
        </Link>

        {/* Center: Content */}
        <div className="flex flex-col gap-2 ml-4 flex-grow min-w-0">
          {/* 👇 Category name – now from the joined field */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {product.category_name || formatCategorySlug(product.category)}
          </div>

          <div className="flex items-start justify-between gap-2">
            <Link href={`/products/${product.id}`} className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 hover:text-blue-600 transition-colors">
                {product.title}
              </h3>
            </Link>

            {/* Note Presence Indicator */}
            {hasNote && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-[9px] font-bold text-amber-700 dark:text-amber-400 flex-shrink-0">
                <StickyNote className="w-2.5 h-2.5" />
                NOTE
              </div>
            )}
          </div>

          {/* Identification Grid: ID, ASIN, EAN, BL, Shopify */}
          <div className="flex flex-wrap gap-1.5">
            {product.sku && (
              <CopyBadge label="SKU" value={product.sku} variant="orange" />
            )}{" "}
            {product.baselinker_id && (
              <CopyBadge
                label="BL"
                value={product.baselinker_id}
                variant="blue"
              />
            )}
            {product.shopify_id && (
              <CopyBadge
                label="SH"
                value={product.shopify_id}
                variant="green"
              />
            )}
            {product.id && (
              <CopyBadge
                label="ID"
                value={product.id.toString()}
                variant="gray"
              />
            )}
            {product.asin && <CopyBadge label="ASIN" value={product.asin} />}
            {product.ean && <CopyBadge label="EAN" value={product.ean} />}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1">
            <div className="flex items-center gap-2">
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
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-3">
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

        {/* Right: Arrow */}
        <Link
          href={`/products/${product.id}`}
          className="ml-4 pl-4 border-l border-gray-50 dark:border-gray-700/50"
        >
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </motion.div>
  );
};

// CopyBadge and StatItem remain unchanged
const CopyBadge = ({
  label,
  value,
  variant = "gray",
}: {
  label: string;
  value: string;
  variant?: "blue" | "gray" | "green" | "orange";
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const variants = {
    blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50",
    gray: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700",
    green:
      "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50",
    orange:
      "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50",
  };

  return (
    <button
      onClick={handleCopy}
      className={`group/badge flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-all active:scale-95 ${variants[variant]}`}
    >
      <span className="opacity-60 font-bold border-r pr-1 border-current/20">
        {label}
      </span>
      <span className="font-mono truncate max-w-[80px]">
        {value.split("/").pop()}
      </span>
      {copied ? (
        <Check className="w-2.5 h-2.5 text-green-500 animate-in zoom-in" />
      ) : (
        <Copy className="w-2.5 h-2.5 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
      )}
    </button>
  );
};

const StatItem = ({ icon, label, count, color }: any) => (
  <div
    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 ${color}`}
  >
    {icon}
    <span className="text-[10px] font-bold">{count}</span>
    <span className="hidden md:inline text-[9px] uppercase tracking-wider opacity-70 font-medium">
      {label}
    </span>
  </div>
);
