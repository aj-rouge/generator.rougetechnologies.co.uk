// app/components/SaveButton.jsx
import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import SaveConfirmationModal from "./SaveConfirmationModal";

export default function SaveButton({
  onSave,
  isSaving,
  isFormValid,
  shouldShowSave,
  mode,
  productTitle,
  hasPendingUploads = false,
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");

  console.log("💾 SaveButton rendered with:", {
    mode,
    productTitle,
    isSaving,
    isFormValid,
    shouldShowSave,
  });

  const handleSaveClick = () => {
    if (isSaving || !isFormValid || hasPendingUploads) return;

    // For create mode, show confirmation modal
    if (mode === "create") {
      setShowConfirmModal(true);
    } else {
      // For edit mode, save directly
      executeSave();
    }
  };

  const executeSave = async () => {
    setSaveStatus("saving");
    setErrorMessage("");

    try {
      await onSave();
      setSaveStatus("success");

      // Auto-close success modal after delay
      setTimeout(() => {
        setShowConfirmModal(false);
        setSaveStatus(null);
      }, 1500);
    } catch (err) {
      console.error("❌ Save Error:", err);
      setErrorMessage(err.message || "Failed to save product");
      setSaveStatus("error");
    }
  };

  const closeModal = () => {
    if (saveStatus === "saving") return;
    setShowConfirmModal(false);
    setSaveStatus(null);
  };

  return (
    <>
      <div
        className={`flex items-center transition-all duration-500 overflow-hidden ${
          shouldShowSave
            ? "max-w-[200px] opacity-100"
            : "max-w-0 opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={handleSaveClick}
          disabled={isSaving || !isFormValid || hasPendingUploads}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
            isSaving || !isFormValid || hasPendingUploads
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {isSaving
              ? "Saving..."
              : mode === "create"
                ? "Save Product"
                : "Save Changes"}
          </span>
        </button>
      </div>

      <SaveConfirmationModal
        isOpen={showConfirmModal}
        onClose={closeModal}
        productTitle={productTitle}
        saveStatus={saveStatus}
        errorMessage={errorMessage}
        onConfirmSave={executeSave}
        mode={mode}
      />
    </>
  );
}
