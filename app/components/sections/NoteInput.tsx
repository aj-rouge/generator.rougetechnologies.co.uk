"use client";

import { useNotification } from "../../context/NotificationContext";
import { useTemplateManager } from "../../utils/useTemplateManager";
import { TemplateDropdown } from "../TemplateDropdown";
import { TemplateModal, type TemplateModalConfig } from "../TemplateModal";

interface NoteInputProps {
  note: string;
  setNote: (value: string) => void;
  additionalDescription1: string;
  setAdditionalDescription1: (value: string) => void;
  additionalDescription2: string;
  setAdditionalDescription2: (value: string) => void;
  additionalDescription3: string;
  setAdditionalDescription3: (value: string) => void;
  productTitle?: string;
}

function LabeledTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="flex-1">
      <label className="block text-black dark:text-gray-100 mb-2 font-medium">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600
                 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                 dark:bg-gray-700 dark:text-gray-100"
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

const MODAL_CONFIG: TemplateModalConfig = {
  createTitle: "New Template",
  editTitle: "Edit Template",
  nameLabel: "Template Name",
  namePlaceholder: "e.g., Missing Charger",
  contentLabel: "Content",
  contentPlaceholder:
    "Enter the template text. Use {{title}} to insert the product title.",
  contentAsTextarea: true,
  contentRows: 6,
  maxWidth: "max-w-2xl",
  contentHelp: (
    <>
      Tip: Use{" "}
      <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
        {"{{title}}"}
      </code>{" "}
      to automatically insert the product title.
    </>
  ),
};

export default function NoteInput({
  note,
  setNote,
  additionalDescription1,
  setAdditionalDescription1,
  additionalDescription2,
  setAdditionalDescription2,
  additionalDescription3,
  setAdditionalDescription3,
  productTitle = "",
}: NoteInputProps) {
  const manager = useTemplateManager({
    endpoint: "/api/note-templates",
    messages: {
      created: "Template created",
      updated: "Template updated",
      deleted: "Template deleted",
      deleteConfirm: "Delete this template?",
      loadFailed: "Failed to load templates",
    },
  });
  const { addNotification } = useNotification();

  const handleSelect = (id: number) => {
    const template = manager.selectTemplate(id);
    if (!template) return;

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

  const handleClear = () => {
    // Intentionally preserves the note content
    manager.clearSelection();
  };

  const handleDelete = async (id: number) => {
    await manager.deleteTemplate(id);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 flex flex-col gap-4 w-full rounded-lg border border-gray-200 dark:border-gray-700">
      <LabeledTextarea
        label="Note for HTML/clients:"
        value={note}
        onChange={setNote}
        placeholder="Describe any issues, missing accessories, cosmetic damage, or warranty information..."
        rows={5}
      />
      <div className="flex flex-col md:flex-row gap-2">
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
          placeholder="Search templates..."
          emptySearchMessage="No templates match your search"
          emptyMessage="No templates yet. Create one!"
          widthClassName="w-1/2"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <LabeledTextarea
          label="Additional description 1"
          value={additionalDescription1}
          onChange={setAdditionalDescription1}
          placeholder="Enter additional description 1..."
          rows={4}
        />
        <LabeledTextarea
          label="Additional description 2"
          value={additionalDescription2}
          onChange={setAdditionalDescription2}
          placeholder="Enter additional description 2..."
          rows={4}
        />
        <LabeledTextarea
          label="Additional description 3"
          value={additionalDescription3}
          onChange={setAdditionalDescription3}
          placeholder="Enter additional description 3..."
          rows={4}
        />
      </div>

      <TemplateModal
        isOpen={manager.showModal}
        editingTemplate={manager.editingTemplate}
        formName={manager.formName}
        formContent={manager.formContent}
        onFormNameChange={manager.setFormName}
        onFormContentChange={manager.setFormContent}
        onSave={manager.saveTemplate}
        onClose={manager.closeModal}
        isSaving={manager.isSaving}
        config={MODAL_CONFIG}
      />
    </div>
  );
}
