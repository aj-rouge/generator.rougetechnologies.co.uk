import { motion, AnimatePresence } from "framer-motion";
import SearchResultItem from "./SearchResultItem";
import { SearchResult } from "../../../utils/search/schema";
import { Search, Loader2 } from "lucide-react";

interface SearchResultsDropdownProps {
  showDropdown: boolean;
  query: string;
  results: SearchResult[];
  loading: boolean;
  hasSearched: boolean;
  resultsRef: React.RefObject<HTMLDivElement>;
  minChars: number;
  onScroll: () => void;
}

export default function SearchResultsDropdown({
  showDropdown,
  query,
  results,
  loading,
  hasSearched,
  resultsRef,
  minChars,
  onScroll,
}: SearchResultsDropdownProps) {
  return (
    <AnimatePresence>
      {showDropdown && query.length >= minChars && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          <div
            ref={resultsRef}
            onScroll={onScroll}
            className="max-h-[480px] overflow-y-auto"
          >
            {results.length > 0
              ? results.map((result, index) => (
                  <SearchResultItem
                    key={`${result.slug}-${index}`}
                    result={result}
                  />
                ))
              : !loading && hasSearched && <NoResultsFound query={query} />}
            {loading && <LoadingSpinner />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NoResultsFound({ query }: { query: string }) {
  return (
    <div className="py-12 px-6 text-center">
      {/* Icon Container */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-700/50 mb-4">
        <Search className="w-8 h-8 text-gray-300 dark:text-gray-500" />
      </div>

      {/* Query Text Handling */}
      <div className="max-w-80 mx-auto">
        <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
          No results found for{" "}
          <span
            className="block mt-1 text-gray-600 dark:text-gray-400 italic break-all line-clamp-2"
            title={query}
          >
            &quot;{query}&quot;
          </span>
        </p>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="p-10 text-center">
      <Loader2 className="inline-block h-6 w-6 animate-spin text-blue-500" />
    </div>
  );
}
