import Link from "next/link";
import { SearchResult } from "../../../utils/search/schema";

// Extracted for readability
export default function SearchResultItem({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/${result.category}/${result.slug}`}
      className="block p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div
            className="font-medium text-gray-900 dark:text-gray-100 mb-1"
            dangerouslySetInnerHTML={{
              __html: result.snippet?.title || result.title,
            }}
          />
          <div className="text-xs text-gray-600 dark:text-gray-400 space-x-2 mb-2">
            <span>SKU: {result.sku}</span>
            {result.ean && <span>| EAN: {result.ean}</span>}
            {result.asin && <span>| ASIN: {result.asin}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {result.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
