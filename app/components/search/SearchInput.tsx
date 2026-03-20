import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

interface SearchInputProps {
  query: string;
  setQuery: (query: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  searchActive: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  maxLength: number;
}

export default function SearchInput({
  query,
  setQuery,
  inputRef,
  searchActive,
  onFocus,
  onBlur,
  onClear,
  onKeyDown,
  maxLength,
}: SearchInputProps) {
  return (
    <div className="flex items-center h-14 px-4">
      <div className="flex-shrink-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {!searchActive && (
            <motion.button
              key="icon"
              onClick={() => inputRef.current?.focus()}
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -20 }}
              className="text-gray-400 mr-2 cursor-text hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Search className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <motion.input
        ref={inputRef}
        layout
        type="text"
        value={query}
        maxLength={maxLength}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder="Search by title, SKU, EAN..."
        className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 py-2"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />

      <div className="flex items-center">
        <AnimatePresence>
          {query.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={onClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
