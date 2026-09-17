// components/forms/sections/ShippingMethodInput.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface ShippingMethodTemplate {
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

interface ShippingMethodInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// -----------------------------------------------------------------------------
// Sub-component: TemplateItem (row in dropdown)
// -----------------------------------------------------------------------------
interface TemplateItemProps {
  template: ShippingMethodTemplate;
  isSelected: boolean;
  showSnippet: boolean;
  onSelect: (id: number) => void;
  onEdit: (template: ShippingMethodTemplate) => void;
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
          title="Edit shipping method"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete shipping method"
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
  templates: ShippingMethodTemplate[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  selectedTemplateId: number | "";
  onSelect: (id: number) => void;
  onEdit: (template: ShippingMethodTemplate) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
  onNew: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
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
  disabled = false,
}: TemplateDropdownProps) {
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
      filtered = [...templates].sort((a, b) => b.updated_at - a.updated_at);
    }
    return filtered;
  }, [templates, searchQuery]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
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
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => !disabled && setIsDropdownOpen(true)}
          placeholder={
            selectedTemplate
              ? `Selected: ${selectedTemplate.name}`
              : "Search shipping methods..."
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
          title="Create new shipping method"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {isDropdownOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : displayedTemplates.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery.trim()
                ? "No shipping methods match your search"
                : "No shipping methods yet. Create one!"}
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
  editingTemplate: ShippingMethodTemplate | null;
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingTemplate ? "Edit Shipping Method" : "New Shipping Method"}
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
              Display Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="e.g., Royal Mail Tracked 48"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Friendly label shown in the dropdown.
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stored Value
            </label>
            <input
              type="text"
              value={formContent}
              onChange={(e) => onFormContentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
              placeholder="e.g., RM Tracked 48 (Parcels)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The exact value saved on the product.
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
// Main Component: ShippingMethodInput
// -----------------------------------------------------------------------------
export default function ShippingMethodInput({
  value,
  onChange,
  disabled = false,
}: ShippingMethodInputProps) {
  const [templates, setTemplates] = useState<ShippingMethodTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ShippingMethodTemplate | null>(null);
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
      const res = await fetch("/api/shipping-method-templates");
      const json = (await res.json()) as ApiResponse<ShippingMethodTemplate[]>;
      if (json.success) {
        setTemplates(json.data || []);
      } else {
        addNotification({
          message: json.error || "Failed to load shipping methods",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep internal selection in sync with external value
  useEffect(() => {
    if (!value) {
      setSelectedTemplateId("");
      return;
    }
    const match = templates.find((t) => t.content === value);
    setSelectedTemplateId(match ? match.id : "");
  }, [value, templates]);

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
    onChange(template.content);
    addNotification({
      message: `Shipping method "${template.name}" applied`,
      type: "success",
    });
  };

  const clearSelection = () => {
    setSelectedTemplateId("");
    setSearchQuery("");
    setIsDropdownOpen(false);
    onChange("");
    if (inputRef.current) inputRef.current.focus();
  };

  // Modal handlers
  const openModal = (template?: ShippingMethodTemplate) => {
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
        message: "Name and value are required",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = editingTemplate
        ? `/api/shipping-method-templates/${editingTemplate.id}`
        : "/api/shipping-method-templates";
      const method = editingTemplate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          content: formContent.trim(),
        }),
      });
      const json = (await res.json()) as ApiResponse<ShippingMethodTemplate>;
      if (json.success) {
        addNotification({
          message: editingTemplate
            ? "Shipping method updated"
            : "Shipping method created",
          type: "success",
        });
        await fetchTemplates();
        closeModal();
        if (json.data) {
          setSelectedTemplateId(json.data.id);
          // If we just edited the template currently applied, refresh the value
          if (editingTemplate && editingTemplate.content === value) {
            onChange(json.data.content);
          }
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
    if (!confirm("Delete this shipping method?")) return;
    // Snapshot before the refetch so we can detect a currently-applied delete
    const toDelete = templates.find((t) => t.id === id);
    try {
      const res = await fetch(`/api/shipping-method-templates/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as ApiResponse;
      if (json.success) {
        addNotification({
          message: "Shipping method deleted",
          type: "success",
        });
        await fetchTemplates();
        if (selectedTemplateId === id) {
          setSelectedTemplateId("");
        }
        if (toDelete && toDelete.content === value) {
          onChange("");
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
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
        Shipping Method
      </label>
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
        disabled={disabled}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {value ? `Selected value: ${value}` : "Carrier and service level"}
      </p>

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
