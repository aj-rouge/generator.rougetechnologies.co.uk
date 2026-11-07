"use client";

import { useState, useEffect, useRef } from "react";
import type { BaseTemplate, ApiResponse } from "./types";
import { useNotification } from "../context/NotificationContext";

export interface TemplateManagerMessages {
  created?: string;
  updated?: string;
  deleted?: string;
  deleteConfirm?: string;
  loadFailed?: string;
}

export interface UseTemplateManagerOptions {
  endpoint: string;
  messages?: TemplateManagerMessages;
}

export interface TemplateSaveResult {
  saved: BaseTemplate;
  wasEditing: boolean;
  previous: BaseTemplate | null;
}

export function useTemplateManager({
  endpoint,
  messages = {},
}: UseTemplateManagerOptions) {
  const {
    created = "Template created",
    updated = "Template updated",
    deleted = "Template deleted",
    deleteConfirm = "Delete this template?",
    loadFailed = "Failed to load templates",
  } = messages;

  const [templates, setTemplates] = useState<BaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BaseTemplate | null>(
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

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      const json = (await res.json()) as ApiResponse<BaseTemplate[]>;
      if (json.success) {
        setTemplates(json.data || []);
      } else {
        addNotification({ message: json.error || loadFailed, type: "error" });
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
  }, [endpoint]);

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

  const selectTemplate = (id: number): BaseTemplate | null => {
    const template = templates.find((t) => t.id === id);
    if (!template) return null;
    setSelectedTemplateId(id);
    setSearchQuery("");
    setIsDropdownOpen(false);
    return template;
  };

  const clearSelection = () => {
    setSelectedTemplateId("");
    setSearchQuery("");
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const openModal = (template?: BaseTemplate) => {
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

  const saveTemplate = async (): Promise<TemplateSaveResult | null> => {
    if (!formName.trim() || !formContent.trim()) {
      addNotification({
        message: "Name and content are required",
        type: "error",
      });
      return null;
    }

    const wasEditing = !!editingTemplate;
    const previous = editingTemplate;

    setIsSaving(true);
    try {
      const url = wasEditing ? `${endpoint}/${previous!.id}` : endpoint;
      const method = wasEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          content: formContent.trim(),
        }),
      });
      const json = (await res.json()) as ApiResponse<BaseTemplate>;

      if (json.success && json.data) {
        addNotification({
          message: wasEditing ? updated : created,
          type: "success",
        });
        await fetchTemplates();
        closeModal();
        setSelectedTemplateId(json.data.id);
        return { saved: json.data, wasEditing, previous };
      }

      addNotification({
        message: json.error || "Operation failed",
        type: "error",
      });
      return null;
    } catch (err: any) {
      addNotification({ message: err.message, type: "error" });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (id: number): Promise<BaseTemplate | null> => {
    if (!confirm(deleteConfirm)) return null;
    const toDelete = templates.find((t) => t.id === id) || null;

    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const json = (await res.json()) as ApiResponse;

      if (json.success) {
        addNotification({ message: deleted, type: "success" });
        await fetchTemplates();
        if (selectedTemplateId === id) setSelectedTemplateId("");
        return toDelete;
      }

      addNotification({
        message: json.error || "Delete failed",
        type: "error",
      });
      return null;
    } catch (err: any) {
      addNotification({ message: err.message, type: "error" });
      return null;
    }
  };

  return {
    templates,
    loading,
    showModal,
    editingTemplate,
    formName,
    setFormName,
    formContent,
    setFormContent,
    isSaving,
    selectedTemplateId,
    setSelectedTemplateId,
    searchQuery,
    setSearchQuery,
    isDropdownOpen,
    setIsDropdownOpen,
    dropdownRef,
    inputRef,
    fetchTemplates,
    selectTemplate,
    clearSelection,
    openModal,
    closeModal,
    saveTemplate,
    deleteTemplate,
  };
}
