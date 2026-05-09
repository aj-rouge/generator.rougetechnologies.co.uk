// app/components/ProductFormHeader.jsx
import Link from "next/link";
import { Home, ExternalLink, ShoppingBag, Package } from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import DeleteButton from "./delete-product/DeleteButton";
import SaveButton from "./save-product/SaveButton";
import UpdateShopifyButton from "./UpdateShopifyButton";
import SyncBaselinkerButton from "./SyncBaselinkerButton";
import UniversalImportButton from "./import-product/UniversalImportButton";

export default function ProductFormHeader({
  mode,
  title,
  isSaving,
  isFormValid,
  shouldShowSave,
  onSave,
  selectedCategory,
  hasPendingUploads = false,
  uuid,
  baselinkerId,
  shopifyId,
  onBaselinkerCreated,
  onUniversalImport,
}) {
  const isEdit = mode === "edit";

  const HomeButton = () => (
    <Link
      href="/"
      className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <Home className="w-4 h-4" />
    </Link>
  );

  return (
    <div className="fixed top-0 z-40 w-full bg-gray-200 dark:bg-black border-b border-gray-300 dark:border-gray-800 px-4">
      {isEdit ? (
        <div className="py-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-xl font-bold text-black dark:text-white truncate max-w-fit">
              Editing: {title}
            </h1>
            <div className="flex items-center gap-3">
              <HomeButton />
              <DeleteButton
                productTitle={title}
                selectedCategory={selectedCategory}
                uuid={uuid}
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-end items-center gap-3 mt-4">
            <DarkModeToggle />
            <UniversalImportButton onImport={onUniversalImport} />
            {(shopifyId || baselinkerId) && (
              <div className="flex items-center gap-2 mr-2 border-r border-gray-300 dark:border-gray-700 pr-3">
                {shopifyId && shopifyId !== "null" && (
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
                {baselinkerId && baselinkerId !== "null" && (
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
            <div className="flex items-center gap-2">
              {shopifyId && shopifyId !== "null" && (
                <UpdateShopifyButton
                  shopifyId={shopifyId}
                  productTitle={title}
                  disabled={isSaving}
                  uuid={uuid}
                  onSave={onSave}
                />
              )}
              <SyncBaselinkerButton
                productTitle={title}
                disabled={isSaving}
                uuid={uuid}
                onSave={onSave}
                onBaselinkerCreated={onBaselinkerCreated}
                baselinkerId={baselinkerId}
              />
            </div>
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
      ) : (
        <div className="py-4">
          <div className="grid lg:grid-cols-2 gap-2">
            <div className="flex items-center gap-3 justify-start">
              <HomeButton />
              <h2 className="text-md lg:text-xl font-bold text-black dark:text-gray-100">
                {title || "Create New Product"}
              </h2>
            </div>
            <div className="flex flex-row justify-end gap-3">
              <DarkModeToggle />
              <UniversalImportButton
                onImport={onUniversalImport}
                disabled={!selectedCategory}
              />
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
      )}
    </div>
  );
}
