"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useOutsideClick } from "./useOutsideClick";

interface Option {
  value: string | number;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: readonly Option[] | Option[];
  selectedValue: string | number;
  onSelect: (value: any) => void;
  Icon: LucideIcon;
  width?: string;
}

export const FilterDropdown = ({
  label,
  options,
  selectedValue,
  onSelect,
  Icon,
  width = "w-48",
}: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick(dropdownRef, buttonRef, () => setIsOpen(false));

  return (
    <div className="relative">
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center justify-between gap-2 px-3 py-1.5
          text-sm font-medium rounded-md
          border transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
          bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
        "
        whileTap={{ scale: 0.97 }}
      >
        <span className="min-w-[80px] text-left">{label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute left-0 mt-1 ${width}
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-lg shadow-lg z-20 overflow-hidden
            `}
          >
            <div className="py-1">
              {options.map((opt) => (
                <motion.button
                  key={opt.value}
                  onClick={() => {
                    onSelect(opt.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm
                    transition-colors duration-150
                    ${
                      opt.value === selectedValue
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }
                  `}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    animate={{
                      scale: opt.value === selectedValue ? 1 : 0,
                      opacity: opt.value === selectedValue ? 1 : 0,
                    }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </motion.div>
                  <span>{opt.label}</span>
                  {opt.value === selectedValue && (
                    <motion.span
                      layoutId="active-indicator"
                      className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
