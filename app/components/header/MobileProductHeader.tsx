"use client";

import Link from "next/link";
import {
  Home,
  ExternalLink,
  ShoppingBag,
  Package,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DarkModeToggle } from "./DarkModeToggle";
import DeleteButton from "./delete-product/DeleteButton";
import SaveButton from "./save-product/SaveButton";
import UpdateShopifyButton from "./UpdateShopifyButton";
import SyncBaselinkerButton from "./SyncBaselinkerButton";
import UniversalImportButton from "./import-product/UniversalImportButton";
import { useState, useEffect } from "react";

interface MobileProductHeaderProps {
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
}

export function MobileProductHeader({
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
}: MobileProductHeaderProps) {
  const isEdit = mode === "edit";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const HomeButton = () => (
    <Link
      href="/"
      className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <Home className="w-4 h-4" />
    </Link>
  );

  return (
    <>
      <div className="sticky top-0 z-40 w-full bg-gray-200 dark:bg-black border-b border-gray-300 dark:border-gray-800 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <HomeButton />
          <div className="flex items-center gap-2">
            <SaveButton
              onSave={onSave}
              isSaving={isSaving}
              isFormValid={isFormValid}
              shouldShowSave={shouldShowSave}
              mode={mode}
              productTitle={title}
            />
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors"
              aria-label="Open actions menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="mt-2">
          <h1 className="text-sm font-semibold text-black dark:text-gray-100 truncate">
            {isEdit ? `Editing: ${title}` : title || "Create New Product"}
          </h1>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Actions
                </h3>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <UniversalImportButton
                  onImport={onUniversalImport}
                  disabled={!selectedCategory && !isEdit}
                />
                {isEdit && (shopifyId || baselinkerId) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      External Platforms
                    </h4>
                    <div className="flex flex-col gap-2">
                      {shopifyId && shopifyId !== "null" && (
                        <a
                          href={`https://admin.shopify.com/store/rouge-technologies/products/${shopifyId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" />
                            View on Shopify
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {baselinkerId && baselinkerId !== "null" && (
                        <a
                          href={`https://panel-g.baselinker.com/inventory_products#product:${baselinkerId}#tab:information`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            View on Baselinker
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {isEdit && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sync & Updates
                    </h4>
                    <div className="flex flex-col gap-2">
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
                  </div>
                )}
                <DarkModeToggle />
                {isEdit && (
                  <DeleteButton
                    productTitle={title}
                    selectedCategory={selectedCategory}
                    uuid={uuid}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
