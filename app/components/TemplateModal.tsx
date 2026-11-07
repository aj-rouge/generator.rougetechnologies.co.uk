"use client";

import { X, Save } from "lucide-react";
import type { BaseTemplate } from "../utils/types";

export interface TemplateModalConfig {
  createTitle: string;
  editTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  nameHelp?: string;
  contentLabel: string;
  contentPlaceholder: string;
  contentHelp?: React.ReactNode;
  contentAsTextarea?: boolean;
  contentRows?: number;
  maxWidth?: string;
}

interface TemplateModalProps {
  isOpen: boolean;
  editingTemplate: BaseTemplate | null;
  formName: string;
  formContent: string;
  onFormNameChange: (v: string) => void;
  onFormContentChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  config: TemplateModalConfig;
}

export function TemplateModal({
  isOpen,
  editingTemplate,
  formName,
  formContent,
  onFormNameChange,
  onFormContentChange,
  onSave,
  onClose,
  isSaving,
  config,
}: TemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${
          config.maxWidth || "max-w-lg"
        } w-full max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingTemplate ? config.editTitle : config.createTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {config.nameLabel}
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder={config.namePlaceholder}
            />
            {config.nameHelp && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {config.nameHelp}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {config.contentLabel}
            </label>
            {config.contentAsTextarea ? (
              <textarea
                value={formContent}
                onChange={(e) => onFormContentChange(e.target.value)}
                rows={config.contentRows ?? 6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                placeholder={config.contentPlaceholder}
              />
            ) : (
              <input
                type="text"
                value={formContent}
                onChange={(e) => onFormContentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                placeholder={config.contentPlaceholder}
              />
            )}
            {config.contentHelp && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {config.contentHelp}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4" /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
