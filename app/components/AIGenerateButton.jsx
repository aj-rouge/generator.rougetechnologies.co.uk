"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

export const AIGenerateButton = ({
  endpoint,
  body,
  onSuccess,
  fallback,
  successMessage = "AI generation successful!",
  disabled = false,
  children = "Generate with AI",
  className = "",
}) => {
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotification();

  const handleGenerate = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (onSuccess) onSuccess(data);
      addNotification({ message: successMessage, type: "success" });
    } catch (error) {
      console.error(error);
      if (fallback) {
        fallback();
        addNotification({
          message: `AI failed, using fallback: ${error.message}`,
          type: "warning",
        });
      } else {
        addNotification({ message: error.message, type: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={disabled || loading}
      className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
        disabled || loading
          ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500"
          : "bg-purple-600 hover:bg-purple-700 text-white"
      } ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
