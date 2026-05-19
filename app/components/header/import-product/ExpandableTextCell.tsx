import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableTextCellProps {
  value: any;
}

export function ExpandableTextCell({ value }: ExpandableTextCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (value === null || value === undefined)
    return <span className="text-gray-400">—</span>;

  let fullText: string;
  if (typeof value === "object") {
    fullText = JSON.stringify(value, null, 2);
  } else {
    fullText = String(value);
  }

  const truncated =
    fullText.length > 100 ? fullText.slice(0, 100) + "…" : fullText;
  const displayText = isExpanded ? fullText : truncated;
  const isTruncatable = fullText.length > 100;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTruncatable) setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative max-w-3xl">
      <div
        className={`text-black dark:text-white ${
          isExpanded
            ? "whitespace-pre-wrap break-words pb-0"
            : "whitespace-normal"
        }`}
      >
        {displayText}
      </div>
      {isTruncatable && !isExpanded && (
        <button
          onClick={handleToggle}
          className="absolute bottom-0 left-0 right-0 flex justify-center items-center bg-gradient-to-t from-white to-transparent dark:from-gray-900/80 dark:to-transparent transition-all hover:opacity-80"
          title="Expand"
        >
          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      )}
      {isTruncatable && isExpanded && (
        <button
          onClick={handleToggle}
          className="mt-1 flex justify-center items-center w-full py-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 transition-all"
          title="Collapse"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
