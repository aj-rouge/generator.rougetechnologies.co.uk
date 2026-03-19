"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, LayoutGroup } from "framer-motion";
import SearchInput from "./SearchInput";
import SearchStatusFooter from "./SearchStatusFooter";
import CategoryFilter from "../recent/CategoryFilter";
import { detectSearchType } from "../../utils/search/recognize";

const DEBOUNCE_MS = 500;
const MIN_CHARS = 4;
const DEFAULT_LIMIT = 80;

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [category, setCategory] = useState(""); // This will be synced with CategoryFilter

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { label: detectedTypeLabel } = detectSearchType(query);

  const fetchResults = useCallback(
    async (searchQuery: string, nextCursor?: string) => {
      if (searchQuery.length < MIN_CHARS) return;

      setLoading(true);
      setHasSearched(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          type: "auto",
          limit: DEFAULT_LIMIT.toString(),
          ...(nextCursor && { cursor: nextCursor }),
        });

        // Add filters
        if (category) params.append("category", category);

        const response = await fetch(`/api/product/search?${params}`);
        const data = await response.json();

        setResults((prev) =>
          nextCursor ? [...prev, ...data.results] : data.results,
        );
        setCursor(data.nextCursor || null);
        setHasMore(!!data.nextCursor);
        setShowDropdown(true);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    },
    [category],
  );

  // Handle category changes from CategoryFilter
  const handleCategoryChange = useCallback(
    (newCategory: string) => {
      setCategory(newCategory);
      // Optionally reset search results when category changes
      setResults([]);
      setCursor(null);
      if (query.length >= MIN_CHARS) {
        fetchResults(query);
      }
    },
    [query, fetchResults],
  );

  useEffect(() => {
    if (query.length < MIN_CHARS) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchResults(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  const handleScroll = () => {
    if (!resultsRef.current || !cursor || !hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = resultsRef.current;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      fetchResults(query, cursor);
    }
  };
  // Inside SearchBar component, after the existing useEffect
  useEffect(() => {
    // If the query matches an identifier pattern and has the exact length,
    // we can call the instant endpoint immediately (bypassing debounce).
    const { type } = detectSearchType(query);
    const isCompleteIdentifier =
      (type === "ean" && query.length === 13) ||
      (type === "asin" && query.length === 10) ||
      (type === "sku" && query.length >= 3 && query.length <= 50) ||
      (type === "baselinker_id" && query.length >= 8 && query.length <= 10) ||
      (type === "shopify_id" && query.length === 14);

    if (isCompleteIdentifier && query.length >= MIN_CHARS) {
      // Cancel any pending debounce
      // Call instant endpoint
      const checkInstant = async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/product/instant?q=${encodeURIComponent(query)}`,
          );
          const data = await res.json();
          if (data.redirect) {
            window.location.href = data.redirect; // or use router.push
          } else if (data.results.length > 0) {
            setResults(data.results);
            setShowDropdown(true);
          } else {
            setResults([]);
            setShowDropdown(true); // show "no results"
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      checkInstant();
    }
  }, [query]); // careful: this will run on every keystroke; we need to add debounce logic
  const handleInputFocus = () => {
    setSearchActive(true);
    if (query.length >= MIN_CHARS) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        setSearchActive(false);
      }
    }, 150);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSearchActive(false);
    setHasSearched(false);
    setCategory(""); // Clear category as well
    inputRef.current?.focus();
  };

  return (
    <LayoutGroup>
      <div className="relative w-full max-w-2xl mx-auto space-y-3">
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
            maxLength={DEFAULT_LIMIT}
          />

          <SearchStatusFooter
            query={query}
            detectedTypeLabel={detectedTypeLabel}
            minChars={MIN_CHARS}
            maxLength={DEFAULT_LIMIT}
          />
        </motion.div>
      </div>
    </LayoutGroup>
  );
}
