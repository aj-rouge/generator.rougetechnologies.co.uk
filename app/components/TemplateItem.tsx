"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { BaseTemplate } from "../utils/types";

interface TemplateItemProps {
  template: BaseTemplate;
  isSelected: boolean;
  showSnippet: boolean;
  onSelect: (id: number) => void;
  onEdit: (template: BaseTemplate) => void;
  onDelete: (id: number) => void;
}

export function TemplateItem({
  template,
  isSelected,
  showSnippet,
  onSelect,
  onEdit,
  onDelete,
}: TemplateItemProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(template);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(template.id);
  };

  const showContent =
    showSnippet && template.content.trim() !== template.name.trim();

  return (
    <div
      className={`group flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
        isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""
      }`}
      onClick={() => onSelect(template.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {template.name}
        </div>
        {showContent && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {template.content.substring(0, 60)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <button
          onClick={handleEdit}
          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
