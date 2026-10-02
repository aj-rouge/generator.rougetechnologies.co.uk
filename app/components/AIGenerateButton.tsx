// app/components/AIGenerateButton.tsx
import { useEffect, useState } from "react";
import { Loader2, Sparkles, Pencil, X, Save } from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import { ModelPicker, useModels } from "./ModelPicker";
import { ReasoningControls } from "./ReasoningControls";
import { ThinkingIndicator, ThinkingTask } from "./ThinkingIndicator";
import {
  AUTO_REASONING,
  describeReasoning,
  type ReasoningPreference,
} from "../utils/openrouter/reasoning";
import { useAIStream } from "../utils/useAIStream";

interface PromptTemplateResponse {
  success: boolean;
  data?: { template_text: string; variables?: string[] };
  error?: string;
}

interface AIGenerateButtonProps {
  task: ThinkingTask;
  payload: Record<string, any>;
  onSuccess: (data: any) => void;
  fallback?: () => void;
  successMessage?: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  model?: string;
  onModelChange?: (slug: string) => void;
  showModelPicker?: boolean;
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
  model: controlledModel,
  onModelChange,
  showModelPicker = true,
}: AIGenerateButtonProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [variables, setVariables] = useState<string[]>([]);

  const [internalModel, setInternalModel] = useState("");
  const [reasoning, setReasoning] =
    useState<ReasoningPreference>(AUTO_REASONING);
  const model = controlledModel ?? internalModel;
  const setModel = (slug: string) => {
    if (onModelChange) onModelChange(slug);
    else setInternalModel(slug);
  };

  const { addNotification } = useNotification();
  const { lookup } = useModels();
  const modelMeta = model ? lookup(model) : null;

  const stream = useAIStream<Record<string, any>>({
    onError: (message) => {
      addNotification({ message, type: "error" });
      fallback?.();
    },
  });

  const loading = stream.isActive;

  useEffect(() => {
    if (showEditor) fetchPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor]);

  const fetchPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const res = await fetch(`/api/prompts/${task}`);
      const json = (await res.json()) as PromptTemplateResponse;
      if (json.success && json.data) {
        setPromptText(json.data.template_text);
        setVariables(
          Array.isArray(json.data.variables) ? json.data.variables : [],
        );
      } else {
        addNotification({
          message: json.error || `Failed to load prompt for ${task}`,
          type: "error",
        });
        setPromptText(`# Prompt for ${task} not found in database`);
        setVariables([]);
      }
    } catch (e: any) {
      addNotification({ message: e.message, type: "error" });
    } finally {
      setLoadingPrompt(false);
    }
  };

  const savePrompt = async (): Promise<boolean> => {
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
      }
      addNotification({
        message: json.error || "Failed to save prompt",
        type: "error",
      });
      return false;
    } catch (e: any) {
      addNotification({ message: e.message, type: "error" });
      return false;
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (disabled || loading) return;

    const result = await stream.run({
      task,
      model: model || undefined,
      reasoning,
      ...payload,
    });

    if (!result) return;

    if (result.note !== undefined) {
      onSuccess(result.note);
    } else {
      onSuccess(result);
    }
    addNotification({ message: successMessage, type: "success" });
  };

  const handleSaveAndGenerate = async () => {
    if (await savePrompt()) {
      setShowEditor(false);
      await handleGenerate();
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 flex-wrap">
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
          {loading ? "Generating…" : children}
        </button>

        {showModelPicker && (
          <>
            <ModelPicker value={model} onChange={setModel} showSearch />
            <ReasoningControls
              slug={model}
              value={reasoning}
              onChange={setReasoning}
              disabled={loading}
              compact={false}
            />
            {modelMeta && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {describeReasoning(
                  {
                    ...modelMeta,
                    isReasoningFirst: modelMeta.isReasoningFirst ?? false,
                  } as Parameters<typeof describeReasoning>[0],
                  reasoning,
                )}
              </span>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => setShowEditor(!showEditor)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="Edit prompt template"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {loading && (
          <button
            type="button"
            onClick={stream.cancel}
            className="text-xs text-gray-500 hover:text-red-500 underline"
          >
            Cancel
          </button>
        )}
      </div>

      <ThinkingIndicator
        task={task}
        status={stream.status}
        reasoning={stream.reasoning}
        content={stream.content}
        model={stream.model}
        elapsedMs={stream.elapsedMs}
      />

      {stream.status === "error" && stream.error && (
        <div className="mt-2 text-xs text-red-500">{stream.error}</div>
      )}

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
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!loadingPrompt && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available variables:
              </span>
              {variables.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {variables.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {"{{" + v + "}}"}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  (No variables defined for this task)
                </span>
              )}
            </div>
          )}

          {loadingPrompt ? (
            <div className="text-gray-500">Loading prompt…</div>
          ) : (
            <>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={26}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter the prompt template with {{variables}}"
              />
              <div className="flex flex-col justify-end sm:flex-row gap-2 mt-3">
                <button
                  onClick={handleSaveAndGenerate}
                  disabled={savingPrompt || loading}
                  className="px-4 py-2 justify-center bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save & Generate
                </button>
                <button
                  onClick={savePrompt}
                  disabled={savingPrompt}
                  className="px-4 py-2 justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center gap-2 disabled:opacity-50"
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
