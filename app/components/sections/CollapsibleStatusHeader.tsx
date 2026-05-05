"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { getStatusBadgeColorFromState } from "../../utils/ui/statusHelpers"; // adjust path if needed

interface CollapsibleStatusHeaderProps {
  title: string;
  status: string;
  statusColor?: string;
  rulesPassed?: number;
  totalRules?: number;
  subtitle?: ReactNode;
  severity?: string;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  defaultOpen?: boolean;
  chevronPosition?: "left" | "right";
  className?: string;
  children?: ReactNode;
}

const CollapsibleStatusHeader = ({
  title,
  status,
  statusColor,
  rulesPassed = 0,
  totalRules = 0,
  subtitle = null,
  collapsible = false,
  isOpen: controlledIsOpen,
  onToggle,
  defaultOpen = false,
  chevronPosition = "right",
  className = "",
  children,
}: CollapsibleStatusHeaderProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = collapsible
    ? isControlled
      ? controlledIsOpen
      : internalIsOpen
    : false;

  const handleToggle = () => {
    if (!collapsible) return;
    if (isControlled && onToggle) {
      onToggle(!controlledIsOpen);
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  // Determine state flags from the status text (only if no custom statusColor)
  const getBadgeColor = (): string => {
    if (statusColor) return statusColor;

    const s = status.toLowerCase();
    const hasCriticalError = s.includes("error") || s.includes("✗");
    const hasWarning =
      s.includes("warning") || s.includes("⚠️") || s.includes("needs");
    const isComplete = s.includes("complete") || s.includes("✓");

    return getStatusBadgeColorFromState({
      hasCriticalError,
      hasWarning,
      isComplete,
    });
  };

  const badgeColor = getBadgeColor();

  return (
    <div className={className}>
      <button
        onClick={handleToggle}
        className={`w-full text-left focus:outline-none ${
          collapsible ? "cursor-pointer" : "cursor-default"
        }`}
        disabled={!collapsible}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {chevronPosition === "left" && collapsible && (
              <ChevronDown
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            )}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h3>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${badgeColor}`}
            >
              {status}
            </span>
            {totalRules > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {rulesPassed}/{totalRules} rules
              </div>
            )}
          </div>
          {chevronPosition === "right" && collapsible && (
            <ChevronDown
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
        {subtitle && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {subtitle}
          </div>
        )}
      </button>

      {collapsible && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default CollapsibleStatusHeader;
