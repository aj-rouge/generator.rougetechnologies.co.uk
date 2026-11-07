"use client";

import { useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import { TemplateDropdown } from "../TemplateDropdown";
import {
  TemplateModal,
  type TemplateModalConfig,
} from "../TemplateModal";
import { useTemplateManager } from "../../utils/useTemplateManager";

interface ShippingMethodInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MODAL_CONFIG: TemplateModalConfig = {
  createTitle: "New Shipping Method",
  editTitle: "Edit Shipping Method",
  nameLabel: "Display Name",
  namePlaceholder: "e.g., Royal Mail Tracked 48",
  nameHelp: "Friendly label shown in the dropdown.",
  contentLabel: "Stored Value",
  contentPlaceholder: "e.g., RM Tracked 48 (Parcels)",
  contentHelp: "The exact value saved on the product.",
  contentAsTextarea: false,
  maxWidth: "max-w-lg",
};

export default function ShippingMethodInput({
  value,
  onChange,
  disabled = false,
}: ShippingMethodInputProps) {
  const manager = useTemplateManager({
    endpoint: "/api/shipping-method-templates",
    messages: {
      created: "Shipping method created",
      updated: "Shipping method updated",
      deleted: "Shipping method deleted",
      deleteConfirm: "Delete this shipping method?",
      loadFailed: "Failed to load shipping methods",
    },
  });
  const { addNotification } = useNotification();
  const { templates, setSelectedTemplateId } = manager;

  // Sync selection with external value
  useEffect(() => {
    if (!value) {
      setSelectedTemplateId("");
      return;
    }
    const match = templates.find((t) => t.content === value);
    setSelectedTemplateId(match ? match.id : "");
  }, [value, templates, setSelectedTemplateId]);

  const handleSelect = (id: number) => {
    const template = manager.selectTemplate(id);
    if (!template) return;
    onChange(template.content);
    addNotification({
      message: `Shipping method "${template.name}" applied`,
      type: "success",
    });
  };

  const handleClear = () => {
    manager.clearSelection();
    onChange("");
  };

  const handleSave = async () => {
    const result = await manager.saveTemplate();
    if (
      result?.wasEditing &&
      result.previous &&
      result.previous.content === value
    ) {
      onChange(result.saved.content);
    }
  };

  const handleDelete = async (id: number) => {
    const deleted = await manager.deleteTemplate(id);
    if (deleted && deleted.content === value) {
      onChange("");
    }
  };

  return (
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
        Shipping Method
      </label>
      <TemplateDropdown
        templates={manager.templates}
        loading={manager.loading}
        searchQuery={manager.searchQuery}
        onSearchChange={manager.setSearchQuery}
        isOpen={manager.isDropdownOpen}
        onOpenChange={manager.setIsDropdownOpen}
        selectedTemplateId={manager.selectedTemplateId}
        onSelect={handleSelect}
        onEdit={manager.openModal}
        onDelete={handleDelete}
        onClear={handleClear}
        onNew={() => manager.openModal()}
        dropdownRef={manager.dropdownRef}
        inputRef={manager.inputRef}
        disabled={disabled}
        placeholder="Search shipping methods..."
        emptySearchMessage="No shipping methods match your search"
        emptyMessage="No shipping methods yet. Create one!"
        widthClassName="w-full"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {value ? `Selected value: ${value}` : "Carrier and service level"}
      </p>

      <TemplateModal
        isOpen={manager.showModal}
        editingTemplate={manager.editingTemplate}
        formName={manager.formName}
        formContent={manager.formContent}
        onFormNameChange={manager.setFormName}
        onFormContentChange={manager.setFormContent}
        onSave={handleSave}
        onClose={manager.closeModal}
        isSaving={manager.isSaving}
        config={MODAL_CONFIG}
      />
    </div>
  );
}
