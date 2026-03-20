import { motion } from "framer-motion";

interface SearchDropdownProps {
  results: any[];
  selectedIndex: number;
  query: string;
}

export default function SearchDropdown({
  results,
  selectedIndex,
  query,
}: SearchDropdownProps) {
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
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
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {highlightMatch(product.title, query)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                SKU: {product.sku}
              </div>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 ml-4 whitespace-nowrap">
              {product.category}
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
