"use client";

import { useState, useCallback, ReactNode } from "react";
import { Copy, Check } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

interface CopyToClipboardProps {
  value: string;
  children?: ReactNode;
  className?: string;
  showIcon?: boolean;
  iconSize?: number;
  successMessage?: string;
  errorMessage?: string;
  onCopy?: () => void;
}

export function CopyToClipboard({
  value,
  children,
  className = "",
  showIcon = true,
  iconSize = 16,
  successMessage = "Copied to clipboard!",
  errorMessage = "Failed to copy",
  onCopy,
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);
  const { addNotification } = useNotification();

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        addNotification({
          message: successMessage,
          type: "success",
          duration: 2000,
        });
        onCopy?.();
        setTimeout(() => setCopied(false), 2000);
      } catch {
        addNotification({
          message: errorMessage,
          type: "error",
          duration: 2000,
        });
      }
    },
    [value, successMessage, errorMessage, addNotification, onCopy],
  );

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {children}
      {showIcon &&
        (copied ? (
          <Check
            className=" text-green-500 animate-in zoom-in"
            size={iconSize}
          />
        ) : (
          <Copy size={iconSize} />
        ))}
    </button>
  );
}
