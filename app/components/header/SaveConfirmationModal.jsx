// app/components/SaveConfirmationModal.jsx
import { Save, Loader2, AlertTriangle, X, CheckCircle } from "lucide-react";

export default function SaveConfirmationModal({
  isOpen,
  onClose,
  productTitle,
  saveStatus,
  errorMessage,
  onConfirmSave,
  mode,
}) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (saveStatus === "saving") return;
    onClose();
  };

  const getTitle = () => {
    if (saveStatus === "success") return "Saved!";
    if (saveStatus === "error") return "Save Failed";
    return mode === "create" ? "Save Product" : "Save Changes";
  };

  const getIcon = () => {
    if (saveStatus === "success") return <CheckCircle className="w-6 h-6" />;
    if (saveStatus === "error") return <AlertTriangle className="w-6 h-6" />;
    return <Save className="w-6 h-6" />;
  };

  const getIconColor = () => {
    if (saveStatus === "success") return "text-green-600 dark:text-green-500";
    if (saveStatus === "error") return "text-red-600 dark:text-red-500";
    return "text-blue-600 dark:text-blue-500";
  };

  const getMessage = () => {
    if (saveStatus === "success") {
      return "Product saved successfully!";
    }
    if (saveStatus === "error") {
      return errorMessage || "An error occurred while saving.";
    }
    return (
      <>
        Are you sure you want to save{" "}
        <span className="font-bold">"{productTitle}"</span>?
        {mode === "create" && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This will create a new product in the database.
          </p>
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <div className={`flex items-center gap-3 ${getIconColor()}`}>
            {getIcon()}
            <h3 className="text-xl font-bold">{getTitle()}</h3>
          </div>
          {saveStatus !== "saving" && (
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-2 min-h-[100px] flex items-center">
          {saveStatus === "saving" ? (
            <div className="flex items-center justify-center w-full py-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 dark:text-gray-300">
                {mode === "create"
                  ? "Creating product..."
                  : "Saving changes..."}
              </span>
            </div>
          ) : (
            <div
              className={`w-full ${
                saveStatus === "error"
                  ? "bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-red-600 text-sm"
                  : ""
              }`}
            >
              {getMessage()}
            </div>
          )}
        </div>

        {/* Footer (only when not success/saving) */}
        {(!saveStatus || saveStatus === "error") && (
          <div className="flex items-center justify-end gap-3 p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <button
              onClick={onConfirmSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {mode === "create" ? "Create Product" : "Save Changes"}
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
