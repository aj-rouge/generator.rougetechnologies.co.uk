import { Trash2, Loader2, AlertTriangle, X, CheckCircle } from "lucide-react";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  productTitle,
  deleteStatus,
  errorMessage,
  onConfirmDelete,
}) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (deleteStatus === "deleting") return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <div
            className={`flex items-center gap-3 ${
              deleteStatus === "success"
                ? "text-green-600 dark:text-green-500"
                : "text-red-600 dark:text-red-500"
            }`}
          >
            {deleteStatus === "success" ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
            <h3 className="text-xl font-bold">
              {deleteStatus === "success" ? "Deleted!" : "Delete Product"}
            </h3>
          </div>
          {deleteStatus !== "deleting" && (
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-2">
          {deleteStatus === "success" ? (
            <p className="text-green-600 dark:text-green-400">
              Product deleted successfully! Redirecting...
            </p>
          ) : deleteStatus === "error" ? (
            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-red-600 text-sm">
              {errorMessage}
            </div>
          ) : deleteStatus === "deleting" ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <span className="ml-3 dark:text-gray-300">Purging data...</span>
            </div>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete{" "}
              <span className="font-bold">"{productTitle}"</span>? This action
              is permanent and cannot be undone.
            </p>
          )}
        </div>

        {/* Footer (only when not success/deleting) */}
        {(!deleteStatus || deleteStatus === "error") && (
          <div className="flex items-center justify-end gap-3 p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <button
              onClick={onConfirmDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
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
