import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SpecificationsCellProps {
  count: number;
  list: any[];
}

export function SpecificationsCell({ count, list }: SpecificationsCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="w-full">
      <div
        onClick={handleToggle}
        className="flex items-center justify-between gap-2 cursor-pointer select-none"
      >
        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
          {count} specs
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>
      {isOpen && (
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-60 overflow-y-auto pr-1">
            {list.map((spec, idx) => (
              <div key={idx} className="text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {spec.key}:
                </span>{" "}
                <span className="text-gray-600 dark:text-gray-400 break-words">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
