// app/components/SaveButton.jsx
import { useState } from "react";
import { Save, FileText, Loader2 } from "lucide-react";
import SaveConfirmationModal from "./SaveConfirmationModal";

export default function SaveButton({
  onSave,
  isSaving,
  isFormValid,
  shouldShowSave,
  mode,
  productTitle,
  isComplete,
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSaveClick = () => {
    if (isSaving || !isFormValid) return;
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    setSaveStatus("saving");
    setErrorMessage("");

    try {
      await onSave();
      setSaveStatus("success");
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

  const isCreate = mode === "create";
  const buttonLabel = isComplete
    ? isCreate
      ? "Save Product"
      : "Save Changes"
    : "Save as Draft";

  // Different icons for draft vs complete
  const ButtonIcon = isComplete ? Save : FileText;

  // Distinct styles
  const buttonStyle = isComplete
    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
    : "bg-amber-600 hover:bg-amber-700 text-white shadow-md"; // amber for draft

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
          disabled={isSaving || !isFormValid}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap transition-all ${buttonStyle} ${
            isSaving || !isFormValid
              ? "opacity-50 cursor-not-allowed"
              : "active:scale-95"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ButtonIcon className="w-4 h-4" />
          )}
          <span>{isSaving ? "Saving..." : buttonLabel}</span>
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
        isComplete={isComplete}
      />
    </>
  );
}
