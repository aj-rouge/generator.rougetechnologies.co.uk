// components/search/SearchDropdown.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Clipboard, ImageOff } from "lucide-react";

interface SearchDropdownProps {
  results: any[];
  selectedIndex: number;
  query: string;
}

function ProductThumb({ url, alt }: { url: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="w-12 h-12 flex-shrink-0 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <ImageOff className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
      <img
        src={url}
        alt={alt}
        loading="eager"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function SearchDropdown({
  results,
  selectedIndex,
  query,
}: SearchDropdownProps) {
  const highlightMatch = (text: string, query: string) => {
    if (!text) return text;
    if (!query.trim()) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-blue-300 dark:bg-blue-800 dark:text-white rounded-md px-1"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <ul className="py-2 max-h-96 overflow-auto">
      {results.map((product, idx) => (
        <motion.li
          key={product.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: idx * 0.03 }}
          className={`px-4 py-2 cursor-pointer transition-colors ${
            idx === selectedIndex
              ? "bg-blue-50 dark:bg-blue-900/30"
              : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }`}
          onClick={() => (window.location.href = `/products/${product.id}`)}
        >
          <div className="flex gap-3 items-center">
            <ProductThumb url={product.image_url} alt={product.title || ""} />

            <div className="flex-1 min-w-0 flex justify-between items-center">
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {highlightMatch(product.title, query)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                  SKU: {highlightMatch(product.sku, query)}
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                <div className="text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {product.category}
                </div>
                <Link
                  href={`/create?duplicate=${product.id}`}
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1 flex-shrink-0"
                  title="Duplicate product"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Clipboard className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
