// app/components/ProductFormHeader.jsx
import Link from "next/link";
import { Home } from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import SaveNotification from "./SaveNotification";
import DeleteButton from "./delete-product/DeleteButton";
import SaveButton from "./save-product/SaveButton";
import UpdateBaselinkerButton from "./UpdateBaselinkerButton"; // Import the new button

export default function ProductFormHeader({
  mode,
  title,
  isSaving,
  isFormValid,
  shouldShowSave,
  onSave,
  selectedCategory,
  notification,
  hasPendingUploads = false,
  uuid,
  baselinkerId, // Add this prop
}) {
  const isEdit = mode === "edit";

  return (
    <div className="sticky top-0 z-40 bg-gray-200 dark:bg-black border-b border-gray-300 dark:border-gray-800 px-4">
      <div className="py-4">
        <div
          className={`flex flex-col lg:flex-row gap-4 items-center ${isEdit ? "justify-between" : "grid lg:grid-cols-3"}`}
        >
          <div
            className={`flex items-center gap-3 w-full ${isEdit ? "lg:w-auto flex-col items-start" : "justify-start"}`}
          >
            {isEdit ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
                <DeleteButton
                  productTitle={title}
                  selectedCategory={selectedCategory}
                  uuid={uuid}
                />
              </div>
            ) : (
              <h2 className="text-md lg:text-xl font-bold text-black dark:text-gray-100">
                {title}
              </h2>
            )}
          </div>

          {/* CENTER SECTION: Page Title (for edit mode) */}
          {isEdit && (
            <div className="hidden lg:block text-center">
              <h1 className="text-xl font-bold text-black dark:text-white truncate max-w-fit">
                Editing: {title}
              </h1>
            </div>
          )}

          {/* RIGHT SECTION: Actions */}
          <div
            className={`flex flex-row justify-end gap-3 w-full ${isEdit ? "lg:w-auto flex-1" : ""}`}
          >
            <DarkModeToggle />

            {/* Add the Baselinker update button here (only show in edit mode) */}
            {isEdit && baselinkerId && (
              <UpdateBaselinkerButton
                baselinkerId={baselinkerId}
                productTitle={title}
                disabled={isSaving}
                uuid={uuid}
              />
            )}

            <div className="flex items-center gap-3">
              <SaveButton
                onSave={onSave}
                isSaving={isSaving}
                isFormValid={isFormValid}
                shouldShowSave={shouldShowSave}
                mode={mode}
                productTitle={title}
                hasPendingUploads={hasPendingUploads}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Area */}
      <div
        className={`relative w-full overflow-hidden transition-all duration-300 ${notification?.message ? "max-h-20 opacity-100 mb-4" : "max-h-0 opacity-0"}`}
      >
        {notification?.message && (
          <SaveNotification
            message={notification.message}
            type={notification.type}
            progress={notification.progress}
          />
        )}
      </div>
    </div>
  );
}
