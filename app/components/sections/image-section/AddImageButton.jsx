// components/AddImageButton.jsx
export default function AddImageButton({
  variant = "grid",
  label = "Add Another Image",
  setImages,
}) {
  // 1. Logic for adding a new image record (Local Only)
  const addImage = () => {
    // Define the new object first
    const createNewImage = (currentLength) => ({
      url: null,
      s3Path: null,
      altText: null,
      isUploading: false,
      isUploaded: false,
      uploadStatus: "pending",
      needsUpload: true,
    });

    setImages((prev) => {
      const currentArray = Array.isArray(prev) ? prev : [];
      return [...currentArray, createNewImage(currentArray.length)];
    });
  };

  const baseClasses =
    "border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400";

  if (variant === "grid") {
    return (
      <div className="flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400 min-h-[200px]">
        <button
          onClick={() => addImage()}
          className="flex flex-col items-center justify-center w-full h-full p-4 text-center"
        >
          <div className="text-3xl mb-2">+</div>
          <p className="text-sm font-medium">{label}</p>
        </button>
      </div>
    );
  }

  if (variant === "full-width") {
    return (
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => addImage()}
          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-400 transition-colors text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          + {label}
        </button>
      </div>
    );
  }

  if (variant === "standalone") {
    return (
      <button
        onClick={() => addImage()}
        className={`${baseClasses} flex flex-col items-center justify-center w-full h-full p-4 text-center min-h-[200px]`}
      >
        <div className="text-3xl mb-2">+</div>
        <p className="text-sm font-medium">{label}</p>
      </button>
    );
  }

  return null;
}
