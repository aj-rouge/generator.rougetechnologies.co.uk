"use client";

import Link from "next/link";
import { Home, ExternalLink, ShoppingBag, Package } from "lucide-react";
import { DarkModeToggle } from "./DarkModeToggle";
import DeleteButton from "./delete-product/DeleteButton";
import SaveButton from "./save-product/SaveButton";
import UpdateShopifyButton from "./UpdateShopifyButton";
import SyncBaselinkerButton from "./SyncBaselinkerButton";
import UniversalImportButton from "./import-product/UniversalImportButton";
import { CopyToClipboard } from "../../components/CopyToClipboard";

interface DesktopProductHeaderProps {
  mode: "edit" | "create" | string;
  title: string;
  isSaving: boolean;
  isFormValid: boolean;
  shouldShowSave: boolean;
  onSave: () => void;
  selectedCategory?: string;
  hasPendingUploads?: boolean;
  uuid?: string;
  baselinkerId?: string;
  shopifyId?: string;
  onBaselinkerCreated?: (id: string) => void;
  onUniversalImport?: (data: any) => void;
  condition?: string;
  categoryKeywords?: string[];
}

export function DesktopProductHeader({
  mode,
  title,
  isSaving,
  isFormValid,
  shouldShowSave,
  onSave,
  selectedCategory,
  hasPendingUploads,
  uuid,
  baselinkerId,
  shopifyId,
  onBaselinkerCreated,
  onUniversalImport,
  condition,
  categoryKeywords,
}: DesktopProductHeaderProps) {
  const isEdit = mode === "edit";
  const copyValue = title || (isEdit ? "Untitled" : "Create New Product");

  const HomeButton = () => (
    <Link
      href="/"
      className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <Home className="w-4 h-4" />
    </Link>
  );

  return (
    <div className="sticky top-0 z-40 w-full bg-gray-200 dark:bg-black border-b border-gray-300 dark:border-gray-800 px-4">
      {isEdit ? (
        <div className="py-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <HomeButton />
            <CopyToClipboard
              value={copyValue}
              className="flex items-center gap-2 cursor-pointer"
              showIcon={true}
              iconSize={18}
              successMessage="Product title copied"
            >
              <h1 className="text-md lg:text-xl font-bold text-black dark:text-gray-100 truncate max-w-fit">
                Editing: {title}
              </h1>
            </CopyToClipboard>
            <DeleteButton
              productTitle={title}
              selectedCategory={selectedCategory}
              uuid={uuid}
            />
          </div>
          <div className="flex flex-wrap justify-end items-center gap-3 mt-4">
            <DarkModeToggle />
            <UniversalImportButton
              onImport={onUniversalImport}
              disabled={!selectedCategory}
              categoryName={selectedCategory}
              condition={condition}
              categoryKeywords={categoryKeywords}
            />
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
            />
          </div>
        </div>
      ) : (
        <div className="py-4">
          <div className="grid lg:grid-cols-2 gap-2">
            <div className="flex items-center gap-3 justify-start">
              <HomeButton />
              <CopyToClipboard
                value={copyValue}
                className="flex items-center gap-2 cursor-pointer"
                showIcon={true}
                iconSize={18}
                successMessage="Product title copied"
              >
                <h1 className="text-md lg:text-xl font-bold text-black dark:text-gray-100">
                  {title || "Create New Product"}
                </h1>
              </CopyToClipboard>
            </div>
            <div className="flex flex-row justify-end gap-3">
              <DarkModeToggle />
              <UniversalImportButton
                onImport={onUniversalImport}
                disabled={!selectedCategory}
                categoryName={selectedCategory}
                condition={condition}
                categoryKeywords={categoryKeywords}
              />
              <SaveButton
                onSave={onSave}
                isSaving={isSaving}
                isFormValid={isFormValid}
                shouldShowSave={shouldShowSave}
                mode={mode}
                productTitle={title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
