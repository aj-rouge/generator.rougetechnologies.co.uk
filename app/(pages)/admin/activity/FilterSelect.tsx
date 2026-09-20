"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export type Option = { value: string; label: string };

// ----------------------------------------------------------------
// Animation variants
// ----------------------------------------------------------------
const menuVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -6,
    scale: 0.97,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.025,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.1, ease: [0.4, 0, 1, 1] },
  },
};

const optionVariants: Variants = {
  hidden: { opacity: 0, x: -4 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.14, ease: "easeOut" },
  },
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
export default function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Full option list, with the "clear / placeholder" entry at index 0.
  const allOptions = useMemo<Option[]>(
    () => [{ value: "", label: placeholder }, ...options],
    [options, placeholder],
  );

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  // --------------------------------------------------------------
  // Open/close
  // --------------------------------------------------------------
  const openMenu = () => {
    const idx = allOptions.findIndex((o) => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const selectIndex = (idx: number) => {
    const opt = allOptions[idx];
    if (!opt) return;
    onChange(opt.value);
    closeMenu();
  };

  // --------------------------------------------------------------
  // Outside click
  // --------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // --------------------------------------------------------------
  // Keyboard navigation on the trigger
  // --------------------------------------------------------------
  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        closeMenu();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % allOptions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(
          (i) => (i - 1 + allOptions.length) % allOptions.length,
        );
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(allOptions.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightedIndex >= 0) selectIndex(highlightedIndex);
        break;
      case "Tab":
        closeMenu();
        break;
    }
  };

  // Scroll the highlighted option into view.
  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  // --------------------------------------------------------------
  // Render
  // --------------------------------------------------------------
  const trigger =
    "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:border-gray-400 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors min-w-[140px] justify-between";

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        whileTap={{ scale: 0.98 }}
        className={trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={`truncate ${
            selected
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {label}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex text-gray-400 shrink-0"
          aria-hidden
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="listbox"
            className="absolute left-0 mt-1 w-full min-w-[180px] max-h-72 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 origin-top"
          >
            {allOptions.map((o, i) => {
              const isSelected = o.value === value;
              const isHighlighted = i === highlightedIndex;
              const isPlaceholder = o.value === "";

              return (
                <motion.button
                  key={o.value || "__placeholder__"}
                  type="button"
                  variants={optionVariants}
                  data-option-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => selectIndex(i)}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium"
                      : isHighlighted
                        ? "bg-gray-100 dark:bg-gray-700/60 text-gray-900 dark:text-gray-100"
                        : isPlaceholder
                          ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 24,
                        }}
                        className="inline-flex text-blue-500 shrink-0"
                        aria-hidden
                      >
                        <Check className="w-3.5 h-3.5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
