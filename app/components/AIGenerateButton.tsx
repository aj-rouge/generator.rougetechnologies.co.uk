import { useState, useEffect } from "react";
import { Loader2, Sparkles, Pencil, X, Save } from "lucide-react";
import { useNotification } from "../context/NotificationContext";

// Generic response type for /api/generate
interface GenerateApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

interface PromptTemplateResponse {
  success: boolean;
  data?: {
    template_text: string;
  };
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
  const [showEditor, setShowEditor] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    if (showEditor) {
      fetchPrompt();
    }
  }, [showEditor]);

  const fetchPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const res = await fetch(`/api/prompts/${task}`);
      const json = (await res.json()) as PromptTemplateResponse;
      if (json.success && json.data) {
        setPromptText(json.data.template_text);
      } else {
        addNotification({
          message: json.error || `Failed to load prompt for ${task}`,
          type: "error",
        });
        setPromptText(`# Prompt for ${task} not found in database`);
      }
    } catch (e: any) {
      addNotification({ message: e.message, type: "error" });
    } finally {
      setLoadingPrompt(false);
    }
  };

  const savePrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await fetch(`/api/prompts/${task}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_text: promptText }),
      });
      const json = (await res.json()) as PromptTemplateResponse;
      if (json.success) {
        addNotification({
          message: `Prompt for "${task}" updated successfully`,
          type: "success",
        });
        return true;
      } else {
        addNotification({
          message: json.error || "Failed to save prompt",
          type: "error",
        });
        return false;
      }
    } catch (e: any) {
      addNotification({ message: e.message, type: "error" });
      return false;
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleGenerate = async () => {
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

  const handleSaveAndGenerate = async () => {
    const saved = await savePrompt();
    if (saved) {
      setShowEditor(false);
      await handleGenerate();
    }
  };

  const handleSaveOnly = async () => {
    await savePrompt();
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
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

        <button
          type="button"
          onClick={() => setShowEditor(!showEditor)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="Edit prompt template"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {showEditor && (
        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-800 dark:text-gray-100">
              Edit Prompt for{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                {task}
              </code>
            </h4>
            <button
              onClick={() => setShowEditor(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingPrompt ? (
            <div className="text-gray-500">Loading prompt...</div>
          ) : (
            <>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={6}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter the prompt template with {{variables}}"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveAndGenerate}
                  disabled={savingPrompt || loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save & Generate
                </button>
                <button
                  onClick={handleSaveOnly}
                  disabled={savingPrompt}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Prompt Only
                </button>
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
