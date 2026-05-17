"use client";

import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  depth?: number; // optional, for tree indentation
  icon?: ReactNode; // optional custom icon
}

interface ComboboxProps {
  options: ComboboxOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  renderOption?: (
    option: ComboboxOption,
    isHighlighted: boolean,
    isSelected: boolean,
  ) => ReactNode;
  buttonClassName?: string;
  disabled?: boolean;
  noOptionsMessage?: string;
  searchPlaceholder?: string;
}

export const Combobox = forwardRef<HTMLDivElement, ComboboxProps>(
  (
    {
      options,
      selectedValue,
      onSelect,
      placeholder = "Select...",
      renderOption,
      buttonClassName = "",
      disabled = false,
      noOptionsMessage = "No options found",
      searchPlaceholder = "Type to search...",
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Filter options based on search term
    const filteredOptions = searchTerm.trim()
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : options;

    // Reset highlighted index when filtered list changes
    useEffect(() => {
      setHighlightedIndex(0);
    }, [filteredOptions]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchTerm("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
      if (
        isOpen &&
        listRef.current &&
        listRef.current.children[highlightedIndex]
      ) {
        (
          listRef.current.children[highlightedIndex] as HTMLElement
        ).scrollIntoView({
          block: "nearest",
        });
      }
    }, [highlightedIndex, isOpen]);

    // Focus input when dropdown opens
    useEffect(() => {
      if (isOpen && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            selectOption(filteredOptions[highlightedIndex].value);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSearchTerm("");
          break;
      }
    };

    const selectOption = (value: string) => {
      onSelect(value);
      setIsOpen(false);
      setSearchTerm("");
    };

    const selectedLabel = options.find(
      (opt) => opt.value === selectedValue,
    )?.label;

    const defaultRenderOption = (
      option: ComboboxOption,
      isHighlighted: boolean,
      isSelected: boolean,
    ) => (
      <span
        className="flex items-center gap-2"
        style={{
          paddingLeft: option.depth ? `${option.depth * 1.5}rem` : undefined,
        }}
      >
        {option.icon}
        <span>{option.label}</span>
      </span>
    );

    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 flex justify-between items-center ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          } ${buttonClassName}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          disabled={disabled}
        >
          <span className={!selectedLabel ? "text-gray-400" : ""}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <ul
              ref={listRef}
              className="max-h-60 overflow-auto py-1"
              role="listbox"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {noOptionsMessage}
                </li>
              ) : (
                filteredOptions.map((option, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const isSelected = option.value === selectedValue;
                  return (
                    <li
                      key={option.value}
                      onClick={() => selectOption(option.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`px-4 py-2 cursor-pointer ${
                        isHighlighted
                          ? "bg-blue-100 dark:bg-blue-900/50"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      } ${isSelected ? "bg-blue-50 dark:bg-blue-900/30 font-medium" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {renderOption
                        ? renderOption(option, isHighlighted, isSelected)
                        : defaultRenderOption(
                            option,
                            isHighlighted,
                            isSelected,
                          )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    );
  },
);

Combobox.displayName = "Combobox";
