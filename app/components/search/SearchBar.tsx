"use client";

import { useState, useEffect, useRef } from "react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import SearchInput from "./SearchInput";
import SearchStatusFooter from "./SearchStatusFooter";
import { useDebounce } from "../../utils/useDebounce";
import { detectSearchType } from "../../utils/search/recognize";
import SearchDropdown from "./SearchDropdown";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const { label: detectedTypeLabel } = detectSearchType(query);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= MIN_CHARS) {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Search failed: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setResults(data.results);
          setShowDropdown(true);
        })
        .catch((err) => console.error("Search error:", err))
        .finally(() => setLoading(false));
    } else {
      setResults([]);
      setShowDropdown(false);
    }
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + results.length) % results.length,
        );
        break;
      case "Enter":
        if (selectedIndex >= 0 && results[selectedIndex]) {
          window.location.href = `/products/${results[selectedIndex].slug}`;
        }
        break;
      case "Escape":
        setShowDropdown(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputFocus = () => {
    setSearchActive(true);
    if (query.length >= MIN_CHARS && results.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        setSearchActive(false);
        setShowDropdown(false);
      }
    }, 150);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSearchActive(false);
    inputRef.current?.focus();
  };

  return (
    <LayoutGroup>
      <div className="relative w-full max-w-6xl mx-auto space-y-3">
        <motion.div
          layout
          className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden"
          animate={{
            boxShadow: searchActive
              ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
              : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <SearchInput
            query={query}
            setQuery={setQuery}
            inputRef={inputRef}
            searchActive={searchActive}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onClear={clearSearch}
            onKeyDown={handleKeyDown}
            maxLength={80}
          />

          <SearchStatusFooter
            query={query}
            detectedTypeLabel={detectedTypeLabel}
            minChars={MIN_CHARS}
            maxLength={80}
            loading={loading}
          />
        </motion.div>

        <AnimatePresence>
          {showDropdown && results.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50"
            >
              <SearchDropdown
                results={results}
                selectedIndex={selectedIndex}
                query={query}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
