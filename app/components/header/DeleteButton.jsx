import { useState } from "react";
import { Trash2 } from "lucide-react";
import { generateSeoSlug } from "../../utils/images/seoGenerator";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

export default function DeleteButton({ productTitle, selectedCategory }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null); // 'deleting', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");
  console.log("🗑️ DeleteButton rendered with:", {
    productTitle,
    selectedCategory,
  });
  const handleConfirmDelete = async () => {
    setDeleteStatus("deleting");
    setErrorMessage("");

    try {
      const categorySlug = generateSeoSlug(selectedCategory);
      const productSlug = generateSeoSlug(productTitle);
      const slug = `${categorySlug}/${productSlug}`;

      const response = await fetch("/api/product/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, category: selectedCategory }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Failed to delete");

      setDeleteStatus("success");
      // Redirect after showing success briefly
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err) {
      console.error("❌ Delete Error:", err);
      setErrorMessage(err.message);
      setDeleteStatus("error");
    }
  };

  const closeModal = () => {
    if (deleteStatus === "deleting") return;
    setShowConfirmModal(false);
    setDeleteStatus(null);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirmModal(true)}
        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/30 transition-colors group relative"
        title="Delete product"
      >
        <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>

      <DeleteConfirmationModal
        isOpen={showConfirmModal}
        onClose={closeModal}
        productTitle={productTitle}
        deleteStatus={deleteStatus}
        errorMessage={errorMessage}
        onConfirmDelete={handleConfirmDelete}
      />
    </>
  );
}
