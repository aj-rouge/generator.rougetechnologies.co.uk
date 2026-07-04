// components/forms/sections/NoteInput.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  RefreshCw,
  Search,
  ChevronDown,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface NoteTemplate {
  id: number;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface NoteInputProps {
  note: string;
  setNote: (value: string) => void;
  productTitle?: string;
}

// -----------------------------------------------------------------------------
// Sub-component: NoteTextarea
// -----------------------------------------------------------------------------
function NoteTextarea({
  note,
  setNote,
}: {
  note: string;
  setNote: (v: string) => void;
}) {
  return (
    <div className="flex-1">
      <label className="block text-black dark:text-gray-100 mb-2 font-medium">
        Important Notes / Issues:
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
                 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                 dark:bg-gray-700 dark:text-gray-100"
        placeholder="Describe any issues, missing accessories, cosmetic damage, or warranty information..."
        rows={5}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-component: TemplateItem (row in dropdown)
// -----------------------------------------------------------------------------
interface TemplateItemProps {
  template: NoteTemplate;
  isSelected: boolean;
  showSnippet: boolean;
  onSelect: (id: number) => void;
  onEdit: (template: NoteTemplate) => void;
  onDelete: (id: number) => void;
}

function TemplateItem({
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
        {showSnippet && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {template.content.substring(0, 60)}...
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <button
          onClick={handleEdit}
          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit template"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete template"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-component: TemplateDropdown (combobox)
// -----------------------------------------------------------------------------
interface TemplateDropdownProps {
  templates: NoteTemplate[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  selectedTemplateId: number | "";
  onSelect: (id: number) => void;
  onEdit: (template: NoteTemplate) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  onNew: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
}

function TemplateDropdown({
  templates,
  loading,
  searchQuery,
  setSearchQuery,
  isDropdownOpen,
  setIsDropdownOpen,
  selectedTemplateId,
  onSelect,
  onEdit,
  onDelete,
  onClear,
  onNew,
  dropdownRef,
  inputRef,
}: TemplateDropdownProps) {
  // Compute displayed templates: filter by search, then sort by updated_at desc if no search
  const displayedTemplates = useMemo(() => {
    let filtered = templates;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q),
      );
    } else {
      // Show most recently updated first when no search
      filtered = [...templates].sort((a, b) => b.updated_at - a.updated_at);
    }
    return filtered;
  }, [templates, searchQuery]);

  // Get selected template for placeholder
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  return (
    <div className="relative w-1/2" ref={dropdownRef}>
      <div
        className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500"
      >
        <Search className="ml-2 w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder={
            selectedTemplate
              ? `Selected: ${selectedTemplate.name}`
              : "Search templates..."
          }
          className="flex-1 px-2 py-1.5 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100"
        />
        {selectedTemplate && (
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
          className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          title="Create new template"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isDropdownOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : displayedTemplates.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery.trim()
                ? "No templates match your search"
                : "No templates yet. Create one!"}
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

// -----------------------------------------------------------------------------
// Sub-component: TemplateModal (create/edit)
// -----------------------------------------------------------------------------
interface TemplateModalProps {
  isOpen: boolean;
  editingTemplate: NoteTemplate | null;
  formName: string;
  formContent: string;
  onFormNameChange: (v: string) => void;
  onFormContentChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}

function TemplateModal({
  isOpen,
  editingTemplate,
  formName,
  formContent,
  onFormNameChange,
  onFormContentChange,
  onSave,
  onClose,
  isSaving,
}: TemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingTemplate ? "Edit Template" : "New Template"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., Missing Charger"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <textarea
              value={formContent}
              onChange={(e) => onFormContentChange(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
              placeholder="Enter the template text. Use {{title}} to insert the product title."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tip: Use{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                {"{{title}}"}
              </code>{" "}
              to automatically insert the product title.
            </p>
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

// -----------------------------------------------------------------------------
// Main Component: NoteInput
// -----------------------------------------------------------------------------
export default function NoteInput({
  note,
  setNote,
  productTitle = "",
}: NoteInputProps) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(
    null,
  );
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotification();

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/note-templates");
      const json = (await res.json()) as ApiResponse<NoteTemplate[]>;
      if (json.success) {
        setTemplates(json.data || []);
      } else {
        addNotification({
          message: json.error || "Failed to load templates",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Template selection
  const handleSelectTemplate = (id: number) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setSelectedTemplateId(id);
    setSearchQuery("");
    setIsDropdownOpen(false);

    let content = template.content;
    if (productTitle) {
      content = content.replace(/\{\{title\}\}/g, productTitle);
    }
    setNote(content);
    addNotification({
      message: `Template "${template.name}" applied`,
      type: "success",
    });
  };

  const clearSelection = () => {
    setSelectedTemplateId("");
    setSearchQuery("");
    setIsDropdownOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Modal handlers
  const openModal = (template?: NoteTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormName(template.name);
      setFormContent(template.content);
    } else {
      setEditingTemplate(null);
      setFormName("");
      setFormContent("");
    }
    setShowModal(true);
    setIsDropdownOpen(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormName("");
    setFormContent("");
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim() || !formContent.trim()) {
      addNotification({
        message: "Name and content are required",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = editingTemplate
        ? `/api/note-templates/${editingTemplate.id}`
        : "/api/note-templates";
      const method = editingTemplate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          content: formContent.trim(),
        }),
      });
      const json = (await res.json()) as ApiResponse<NoteTemplate>;
      if (json.success) {
        addNotification({
          message: editingTemplate ? "Template updated" : "Template created",
          type: "success",
        });
        await fetchTemplates();
        closeModal();
        if (json.data) {
          setSelectedTemplateId(json.data.id);
        }
      } else {
        addNotification({
          message: json.error || "Operation failed",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({ message: err.message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/note-templates/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        addNotification({ message: "Template deleted", type: "success" });
        await fetchTemplates();
        if (selectedTemplateId === id) {
          setSelectedTemplateId("");
        }
      } else {
        addNotification({
          message: json.error || "Delete failed",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({ message: err.message, type: "error" });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 flex flex-col gap-4 w-full rounded-lg border border-gray-200 dark:border-gray-700">
      <NoteTextarea note={note} setNote={setNote} />
      <div className="flex flex-col md:flex-row gap-2">
        <TemplateDropdown
          templates={templates}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isDropdownOpen={isDropdownOpen}
          setIsDropdownOpen={setIsDropdownOpen}
          selectedTemplateId={selectedTemplateId}
          onSelect={handleSelectTemplate}
          onEdit={openModal}
          onDelete={handleDeleteTemplate}
          onClear={clearSelection}
          onNew={() => openModal()}
          dropdownRef={dropdownRef}
          inputRef={inputRef}
        />
        {/* Info box */}
        <div className="w-1/2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-gray-700 dark:text-gray-300">
          <p className="font-medium mb-1 dark:text-gray-100">
            📌 Note Guidelines:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Mention any cosmetic issues (scratches, dents, wear)</li>
            <li>List missing accessories (charger, cables, manuals)</li>
            <li>Note any functional issues or limitations</li>
            <li>If no issues, you can leave this empty</li>
          </ul>
        </div>
      </div>

      <TemplateModal
        isOpen={showModal}
        editingTemplate={editingTemplate}
        formName={formName}
        formContent={formContent}
        onFormNameChange={setFormName}
        onFormContentChange={setFormContent}
        onSave={handleSaveTemplate}
        onClose={closeModal}
        isSaving={isSaving}
      />
    </div>
  );
}
