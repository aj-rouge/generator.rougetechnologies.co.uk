"use client";

import { Sparkles, RefreshCw, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNotification } from "../context/NotificationContext";

export default function AIAutofillButton({
  section,
  categoryKeywords,
  existingData,
  onUpdate,
  disabled = false,
  buttonText = "✨ AI",
  size = "sm",
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const { addNotification, updateNotification, removeNotification } =
    useNotification();

  const callAutofill = async (isRegenerate = false) => {
    if (disabled) return;
    if (
      section !== "sku" &&
      (!categoryKeywords || categoryKeywords.length === 0)
    ) {
      addNotification({
        message: "Please select a category first",
        type: "error",
      });
      return;
    }

    setIsLoading(true);
    const toastId = addNotification({
      message: isRegenerate
        ? "Regenerating content..."
        : `Generating ${section}...`,
      type: "info",
    });

    try {
      const res = await fetch("/api/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, categoryKeywords, existingData }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (section === "full") {
        onUpdate(data);
      } else if (section === "sku") {
        onUpdate(data.sku);
      } else {
        onUpdate(data);
      }

      updateNotification(toastId, {
        message: isRegenerate ? "Content regenerated!" : "Autofill complete!",
        type: "success",
        progress: 100,
      });
      setTimeout(() => removeNotification(toastId), 2000);
    } catch (err) {
      updateNotification(toastId, { message: err.message, type: "error" });
    } finally {
      setIsLoading(false);
      setShowRegenerate(false);
    }
  };

  const buttonClass =
    size === "sm"
      ? "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-l-md bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/50 transition-colors"
      : "flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-l-lg transition-colors";

  const chevronClass =
    size === "sm"
      ? "flex items-center px-1 py-1 text-xs font-medium rounded-r-md bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/50 transition-colors border-l border-purple-200 dark:border-purple-800"
      : "flex items-center px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-r-lg transition-colors border-l border-purple-500";

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => callAutofill(false)}
        disabled={isLoading || disabled}
        className={buttonClass}
      >
        <Sparkles className="w-4 h-4" />
        {isLoading ? "..." : buttonText}
      </button>

      {!disabled && !isLoading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowRegenerate(!showRegenerate);
          }}
          className={chevronClass}
          aria-label="More options"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      )}

      {showRegenerate && (
        <div className="absolute right-0 mt-8 z-10 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => callAutofill(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
