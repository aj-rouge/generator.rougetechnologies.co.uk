"use client";

import { useEffect, useState } from "react";
import { useNotification } from "../../context/NotificationContext";

interface PromptTemplate {
  task: string;
  name: string;
  description: string;
  template_text: string;
  variables: string[]; // parsed JSON array
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prompts");
      const json = (await res.json()) as ApiResponse<PromptTemplate[]>;
      if (json.success && json.data) {
        // Parse variables if they are strings
        const parsed = json.data.map((p) => ({
          ...p,
          variables:
            typeof p.variables === "string"
              ? JSON.parse(p.variables)
              : p.variables || [],
        }));
        setPrompts(parsed);
      } else {
        addNotification({
          message: json.error || "Failed to load prompts",
          type: "error",
        });
      }
    } catch (e: any) {
      addNotification({ message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task: string) => {
    const prompt = prompts.find((p) => p.task === task);
    if (!prompt) return;
    setEditingTask(task);
    setEditValue(prompt.template_text);
  };

  const handleCancel = () => {
    setEditingTask(null);
    setEditValue("");
  };

  const handleSave = async (task: string) => {
    try {
      const res = await fetch(`/api/prompts/${task}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_text: editValue }),
      });
      const json = (await res.json()) as ApiResponse<PromptTemplate>;
      if (json.success) {
        addNotification({
          message: `Template for "${task}" updated`,
          type: "success",
        });
        // Update local state
        setPrompts((prev) =>
          prev.map((p) =>
            p.task === task ? { ...p, template_text: editValue } : p,
          ),
        );
        setEditingTask(null);
      } else {
        addNotification({
          message: json.error || "Update failed",
          type: "error",
        });
      }
    } catch (e: any) {
      addNotification({ message: e.message, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading prompts...</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">AI Prompt Templates</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Edit the prompts used for AI generation. Use{" "}
        <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">
          &#123;&#123;variable&#125;&#125;
        </code>{" "}
        placeholders. The following variables are available for each task:
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variables
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
            {prompts.map((prompt) => (
              <tr key={prompt.task}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  <code>{prompt.task}</code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {prompt.description}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                    {prompt.variables.join(", ")}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {editingTask === prompt.task ? (
                    <button
                      onClick={handleCancel}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mr-2"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEdit(prompt.task)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline editing panel */}
      {editingTask && (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
          <h2 className="text-lg font-semibold mb-2">
            Editing: <code>{editingTask}</code>
          </h2>
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Text
            </label>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={12}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Enter the prompt template with {{variables}}"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(editingTask)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
