import { motion, AnimatePresence } from "framer-motion";

interface SearchStatusFooterProps {
  query: string;
  detectedTypeLabel: string;
  minChars: number;
  maxLength: number;
}

export default function SearchStatusFooter({
  query,
  detectedTypeLabel,
  minChars,
  maxLength,
}: SearchStatusFooterProps) {
  return (
    <AnimatePresence>
      {query.length > 0 && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 px-4 py-2"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-bold uppercase transition-colors duration-200 ${
                  query.length >= minChars ? "text-green-500" : "text-gray-400"
                }`}
              >
                {query.length >= minChars
                  ? "● Ready"
                  : `○ Min ${minChars} chars`}
              </span>

              {query.length > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                >
                  {detectedTypeLabel}
                </motion.span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  animate={{
                    width: `${(query.length / maxLength) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {query.length}/{maxLength}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
