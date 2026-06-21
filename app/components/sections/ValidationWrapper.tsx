// app/components/forms/sections/ValidationWrapper.tsx
"use client";

import React from "react";
import { getBorderColorFromScore } from "../../utils/ui/validationColors";

interface ValidationWrapperProps {
  children: React.ReactNode;
  validationScore?: number; // Optional 0-100 percentage
  borderColor?: string;     // Optional: override with custom color
  className?: string;
  showBorder?: boolean;
}

export function ValidationWrapper({
  children,
  validationScore,
  borderColor = "",         // Assigned default fallback value
  className = "",
  showBorder = true,
}: ValidationWrapperProps) {
  // Use custom borderColor if provided, otherwise calculate from score
  const borderColorClass =
    borderColor ||
    (validationScore !== undefined
      ? getBorderColorFromScore(validationScore)
      : "border-gray-300 dark:border-gray-600");

  // Remove border if showBorder is false
  const borderClasses = showBorder ? borderColorClass : "";

  return (
    <div
      className={`bg-white dark:bg-gray-800 w-full p-4 rounded-lg ${borderClasses} transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}