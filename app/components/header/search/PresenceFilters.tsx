"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface PresenceFiltersProps {
  filters: {
    hasImages: boolean;
    hasFeatures: boolean;
    hasParagraphs: boolean;
    hasFeedbacks: boolean;
  };
  onChange: (key: string, value: boolean) => void;
}

export default function PresenceFilters({
  filters,
  onChange,
}: PresenceFiltersProps) {
  const items = [
    { key: "hasImages", label: "Has images" },
    { key: "hasFeatures", label: "Has features" },
    { key: "hasParagraphs", label: "Has paragraphs" },
    { key: "hasFeedbacks", label: "Has feedbacks" },
  ];

  return (
    <motion.div layout className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isChecked = filters[item.key as keyof typeof filters];

        return (
          <motion.button
            key={item.key}
            layout
            type="button"
            onClick={() => onChange(item.key, !isChecked)}
            className={`
              relative inline-flex items-center gap-1.5 px-3 py-1.5 
              rounded-md text-sm font-medium transition-all duration-200
              border focus:outline-none focus:ring-2 focus:ring-offset-2
              ${
                isChecked
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 focus:ring-blue-500"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500"
              }
            `}
            whileTap={{ scale: 0.97 }}
          >
            {/* Checkmark icon with animation */}
            <motion.div
              animate={{
                scale: isChecked ? 1 : 0,
                opacity: isChecked ? 1 : 0,
              }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <Check className="w-3.5 h-3.5" />
            </motion.div>

            {/* Label with subtle shift when checked */}
            <motion.span
              animate={{
                x: isChecked ? 2 : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              {item.label}
            </motion.span>

            {/* Active indicator dot for visual feedback */}
            {isChecked && (
              <motion.span
                layoutId={`active-${item.key}`}
                className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
