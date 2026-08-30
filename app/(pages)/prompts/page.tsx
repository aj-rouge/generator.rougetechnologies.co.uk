"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { useNotification } from "../../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit,
  Save,
  X,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Home,
} from "lucide-react";

interface PromptTemplate {
  task: string;
  name: string;
  description: string;
  template_text: string;
  variables: string[];
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
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  // ---------- Skeleton ----------
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left">Task</th>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Variables</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------- Main UI ----------
  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const isEditing = (task: string) => editingTask === task;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}{" "}
      <div className="w-full flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <FileText className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold">AI Prompt Templates</h1>
        </motion.div>{" "}
        <Link
          href="/"
          className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-gray-600 dark:text-gray-400 mb-6"
      >
        Edit the prompts used for AI generation. Use{" "}
        <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">
          &#123;&#123;variable&#125;&#125;
        </code>{" "}
        placeholders. The following variables are available for each task:
      </motion.p>
      {/* Table */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm"
      >
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
              <Fragment key={prompt.task}>
                {/* Main row */}
                <motion.tr
                  variants={fadeUp}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                    {prompt.task}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {prompt.description}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {prompt.variables.map((v) => (
                        <span
                          key={v}
                          className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-700 dark:text-gray-300"
                        >
                          {v}
                        </span>
                      ))}
                      {prompt.variables.length === 0 && (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {isEditing(prompt.task) ? (
                      // Only a collapse button when editing
                      <button
                        onClick={handleCancel}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-md transition"
                        title="Close editor without saving"
                        disabled={saving}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(prompt.task)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 ml-auto"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </motion.tr>

                {/* Expanded editor row - shown when editing this task */}
                <AnimatePresence>
                  {isEditing(prompt.task) && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="bg-gray-50 dark:bg-gray-900/50"
                    >
                      <td colSpan={4} className="px-6 py-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Template Text
                            </label>
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={15}
                              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                              placeholder="Enter the prompt template with {{variables}}"
                              disabled={saving}
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleSave(prompt.task)}
                              disabled={saving}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center gap-2 transition disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md font-medium transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </Fragment>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
