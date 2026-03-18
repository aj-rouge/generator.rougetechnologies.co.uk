"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SearchApiResponse, SearchResult } from "../../../utils/search/schema";
import { detectSearchType } from "../../../utils/search/recognize";
import { motion, LayoutGroup } from "framer-motion";
import SearchInput from "./SearchInput";
import SearchStatusFooter from "./SearchStatusFooter";
import SearchResultsDropdown from "./SearchResultsDropdown";
import CategoryFilter from "./CategoryFilter";

const DEBOUNCE_MS = 500;
const MIN_CHARS = 4;
const DEFAULT_LIMIT = 80;

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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
        const data: SearchApiResponse = await response.json();

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

        {/* Filters row */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <CategoryFilter onCategoryChange={handleCategoryChange} />
        </div>

        <SearchResultsDropdown
          showDropdown={showDropdown}
          query={query}
          results={results}
          loading={loading}
          hasSearched={hasSearched}
          resultsRef={resultsRef}
          minChars={MIN_CHARS}
          onScroll={handleScroll}
        />
      </div>
    </LayoutGroup>
  );
}
