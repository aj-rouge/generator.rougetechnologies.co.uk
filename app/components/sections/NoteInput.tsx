"use client";

import { useNotification } from "../../context/NotificationContext";
import { useTemplateManager } from "../../utils/useTemplateManager";
import { TemplateDropdown } from "../TemplateDropdown";
import {
  TemplateModal,
  type TemplateModalConfig,
} from "../TemplateModal";

interface NoteInputProps {
  note: string;
  setNote: (value: string) => void;
  productTitle?: string;
}

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
      <NoteTextarea note={note} setNote={setNote} />
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
