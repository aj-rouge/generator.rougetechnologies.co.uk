// app/components/AIGenerateButton.tsx
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

// Generic response type for /api/generate
interface GenerateApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

interface AIGenerateButtonProps {
  task: "title" | "sku" | "paragraphs" | "features" | "note";
  payload: Record<string, any>;
  onSuccess: (data: any) => void;
  fallback?: () => void;
  successMessage?: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AIGenerateButton({
  task,
  payload,
  onSuccess,
  fallback,
  successMessage = "Generated successfully!",
  disabled = false,
  children,
  className = "",
}: AIGenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotification();

  const handleClick = async () => {
    if (disabled) return;
    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, ...payload }),
      });

      const result = (await response.json()) as GenerateApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Generation failed");
      }

      onSuccess(result.data);
      addNotification({ message: successMessage, type: "success" });
    } catch (error: any) {
      addNotification({ message: error.message, type: "error" });
      if (fallback) fallback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        disabled || loading
          ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          : "bg-purple-600 hover:bg-purple-700 text-white"
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {loading ? "Generating..." : children}
    </button>
  );
}
