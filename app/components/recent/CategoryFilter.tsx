"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Folder, Package, X } from "lucide-react";

interface Category {
  id: number;
  slug: string;
  name: string;
  parent_category: string | null;
  created_at: number;
  product_count?: number;
  children?: Category[] | string;
}

interface CategoryFilterProps {
  value: string;
  onChange: (category: string) => void;
  categories: Category[]; // Added categories prop
  loading?: boolean; // Optional loading state
}

export default function CategoryFilter({
  value,
  onChange,
  categories = [], // Add default empty array here
  loading = false, // Default to false if not provided
}: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFilterText("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Return focus to button when dropdown closes
  useEffect(() => {
    if (!isOpen && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setFilterText("");
    }
  };

  const displayCategories = useMemo(() => {
    const flat: {
      value: string;
      label: string;
      indent: number;
      productCount?: number;
    }[] = [{ value: "", label: "All Categories", indent: 0 }];

    categories.forEach((parent) => {
      flat.push({
        value: parent.slug,
        label: parent.name,
        indent: 0,
        productCount: parent.product_count,
      });

      // Safely handle children (could be array or JSON string)
      let childrenArray: Category[] = [];
      if (parent.children) {
        if (Array.isArray(parent.children)) {
          childrenArray = parent.children;
        } else if (typeof parent.children === "string") {
          try {
            childrenArray = JSON.parse(parent.children);
          } catch (e) {
            console.error("Failed to parse children JSON", e);
          }
        }
      }

      childrenArray.forEach((child) => {
        flat.push({
          value: child.slug,
          label: child.name,
          indent: 1,
          productCount: child.product_count,
        });
      });
    });

    return flat;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!filterText) return displayCategories;
    return displayCategories.filter((cat) =>
      cat.label.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [displayCategories, filterText]);

  const handleSelect = (categoryValue: string) => {
    onChange(categoryValue);
    setIsOpen(false);
    setFilterText("");
  };

  const selectedLabel =
    displayCategories.find((opt) => opt.value === value)?.label ||
    "All Categories";

  return (
    <motion.div layout className="relative min-w-[180px]">
      {/* Main button row – no nested buttons */}
      <div
        className={`
          flex items-stretch border rounded-md overflow-hidden
          transition-all duration-200
          focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500
          ${
            value
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          }
        `}
      >
        {/* Dropdown trigger button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Select category"
          className={`
            flex-1 flex items-center justify-between gap-2 px-3 py-1.5
            text-sm font-medium
            focus:outline-none
            ${
              value
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300"
            }
          `}
        >
          <span className="truncate">{selectedLabel}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          </motion.div>
        </button>

        {/* Clear button – only when category selected, now a sibling */}
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSelect("");
            }}
            className={`
              px-2 py-1.5 flex items-center justify-center
              text-sm font-medium
              hover:bg-gray-200 dark:hover:bg-gray-700
              focus:outline-none
              ${
                value
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300"
              }
            `}
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            role="listbox"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-1 w-full sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden"
            onKeyDown={handleDropdownKeyDown}
          >
            {/* Search input */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search categories..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            {/* Options list */}
            <div className="max-h-80 overflow-y-auto overflow-x-hidden py-1">
              {loading && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                </div>
              )}

              {!loading &&
                filteredCategories.map((cat) => (
                  <motion.button
                    key={cat.value}
                    onClick={() => handleSelect(cat.value)}
                    role="option"
                    aria-selected={cat.value === value}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-sm
                      transition-colors duration-150
                      ${cat.indent === 1 ? "pl-8" : ""}
                      ${
                        cat.value === value
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }
                    `}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {cat.value && (
                      <Folder
                        className={`w-4 h-4 flex-shrink-0 ${
                          cat.value === value
                            ? "text-blue-500"
                            : "text-gray-400"
                        }`}
                      />
                    )}

                    {!cat.value && (
                      <motion.div
                        animate={{
                          scale: !value ? 1 : 0,
                          opacity: !value ? 1 : 0,
                        }}
                        transition={{ duration: 0.15 }}
                        className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </motion.div>
                    )}

                    <span className="flex-1 text-left truncate">
                      {cat.label}
                    </span>

                    {cat.productCount ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1">
                        <Package className="w-3 h-3" />
                        <span>{cat.productCount}</span>
                      </span>
                    ) : null}

                    {cat.value === value && (
                      <motion.span
                        layoutId="active-category"
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 ml-1"
                      />
                    )}
                  </motion.button>
                ))}

              {!loading && filteredCategories.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No categories found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
