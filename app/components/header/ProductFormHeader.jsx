import Link from "next/link";
import { Home, ExternalLink, ShoppingBag, Package } from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import SaveNotification from "./SaveNotification";
import DeleteButton from "./delete-product/DeleteButton";
import SaveButton from "./save-product/SaveButton";
import UpdateBaselinkerButton from "./UpdateBaselinkerButton";

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
  baselinkerId,
  shopifyId,
}) {
  const isEdit = mode === "edit";

  // Reusable Home button
  const HomeButton = () => (
    <Link
      href="/"
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <Home className="w-4 h-4" />
      <span className="hidden sm:inline">Home</span>
    </Link>
  );

  return (
    <div className="fixed top-0 z-40 w-full bg-gray-200 dark:bg-black border-b border-gray-300 dark:border-gray-800 px-4">
      <div className="py-4">
        <div
          className={`flex flex-col lg:flex-row gap-4 items-center ${
            isEdit ? "justify-between" : "grid lg:grid-cols-3"
          }`}
        >
          {/* LEFT SECTION */}
          <div
            className={`flex items-center gap-3 w-full ${
              isEdit ? "lg:w-auto flex-col items-start" : "justify-start"
            }`}
          >
            {isEdit ? (
              // Edit mode: Home + Delete buttons
              <div className="flex items-center gap-3">
                <HomeButton />
                <DeleteButton
                  productTitle={title}
                  selectedCategory={selectedCategory}
                  uuid={uuid}
                />
              </div>
            ) : (
              // Create mode: Home button + title
              <div className="flex items-center gap-3">
                <HomeButton />
                <h2 className="text-md lg:text-xl font-bold text-black dark:text-gray-100">
                  {title || "Create New Product"}
                </h2>
              </div>
            )}
          </div>

          {/* CENTER SECTION (only visible in edit mode) */}
          {isEdit && (
            <div className="hidden lg:block text-center">
              <h1 className="text-xl font-bold text-black dark:text-white truncate max-w-fit">
                Editing: {title}
              </h1>
            </div>
          )}

          {/* RIGHT SECTION: Actions */}
          <div
            className={`flex flex-row justify-end gap-3 w-full ${
              isEdit ? "lg:w-auto flex-1" : ""
            }`}
          >
            {/* Dark mode toggle - always on the right */}
            <DarkModeToggle />

            {/* External product links (edit mode only) */}
            {isEdit && (shopifyId || baselinkerId) && (
              <div className="flex items-center gap-2 mr-2 border-r border-gray-300 dark:border-gray-700 pr-3">
                {shopifyId && (
                  <a
                    href={`https://admin.shopify.com/store/rouge-technologies/products/${shopifyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    title="View product in Shopify admin"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">Shopify</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
                {baselinkerId && (
                  <a
                    href={`https://panel-g.baselinker.com/inventory_products#product:${baselinkerId}#tab:information`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    title="View product in Baselinker inventory"
                  >
                    <Package className="w-4 h-4" />
                    <span className="hidden sm:inline">Baselinker</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
              </div>
            )}

            {/* Baselinker update button (edit mode only) */}
            {isEdit && baselinkerId && (
              <UpdateBaselinkerButton
                baselinkerId={baselinkerId}
                productTitle={title}
                disabled={isSaving}
                uuid={uuid}
              />
            )}

            {/* Save button */}
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

      {/* Notification area */}
      <div
        className={`relative w-full overflow-hidden transition-all duration-300 ${
          notification?.message
            ? "max-h-20 opacity-100 mb-4"
            : "max-h-0 opacity-0"
        }`}
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
