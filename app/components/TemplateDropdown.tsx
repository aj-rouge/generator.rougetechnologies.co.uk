"use client";

import { useMemo } from "react";
import { Search, X, Plus } from "lucide-react";
import { TemplateItem } from "./TemplateItem";
export interface BaseTemplate {
  id: number;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
interface TemplateDropdownProps {
  templates: BaseTemplate[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplateId: number | "";
  onSelect: (id: number) => void;
  onEdit: (template: BaseTemplate) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  onNew: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
  placeholder?: string;
  emptySearchMessage?: string;
  emptyMessage?: string;
  widthClassName?: string;
}

export function TemplateDropdown({
  templates,
  loading,
  searchQuery,
  onSearchChange,
  isOpen,
  onOpenChange,
  selectedTemplateId,
  onSelect,
  onEdit,
  onDelete,
  onClear,
  onNew,
  dropdownRef,
  inputRef,
  disabled = false,
  placeholder = "Search templates...",
  emptySearchMessage = "No templates match your search",
  emptyMessage = "No templates yet. Create one!",
  widthClassName = "w-full",
}: TemplateDropdownProps) {
  const displayedTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q),
      );
    }
    return [...templates].sort((a, b) => b.updated_at - a.updated_at);
  }, [templates, searchQuery]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  return (
    <div className={`relative ${widthClassName}`} ref={dropdownRef}>
      <div
        className={`flex items-center border border-gray-300 dark:border-gray-600 rounded-md
                    bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 ${
                      disabled ? "opacity-60" : ""
                    }`}
      >
        <Search className="ml-2 w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          disabled={disabled}
          onChange={(e) => {
            onSearchChange(e.target.value);
            onOpenChange(true);
          }}
          onFocus={() => !disabled && onOpenChange(true)}
          placeholder={
            selectedTemplate
              ? `Selected: ${selectedTemplate.name}`
              : placeholder
          }
          className="flex-1 px-2 py-1.5 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 disabled:cursor-not-allowed"
        />
        {selectedTemplate && !disabled && (
          <button
            onClick={onClear}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onNew}
          disabled={disabled}
          className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Create new"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : displayedTemplates.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery.trim() ? emptySearchMessage : emptyMessage}
            </div>
          ) : (
            displayedTemplates.map((t) => (
              <TemplateItem
                key={t.id}
                template={t}
                isSelected={selectedTemplateId === t.id}
                showSnippet={!!searchQuery.trim()}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
