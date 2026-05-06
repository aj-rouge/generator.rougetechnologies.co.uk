// components/UniversalImportModal/IdentifierForm.tsx
import { useState } from "react";
import { Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";

interface IdentifierFormProps {
  onSubmit: (identifiers: string[]) => Promise<void>;
  isLoading: boolean;
  errorMessage: string;
  onCancel: () => void;
}

export function IdentifierForm({
  onSubmit,
  isLoading,
  errorMessage,
  onCancel,
}: IdentifierFormProps) {
  const [ean, setEan] = useState("");
  const [asin, setAsin] = useState("");
  const [ebayUrl, setEbayUrl] = useState("");
  const [amazonUrl, setAmazonUrl] = useState("");
  const [currysUrl, setCurrysUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifiers = [ean, asin, ebayUrl, amazonUrl, currysUrl]
      .map((s) => s.trim())
      .filter(Boolean);
    await onSubmit(identifiers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Product Identifiers
        </label>
        <p className="text-xs text-gray-500">
          Enter details in any of the fields below
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            placeholder="EAN (e.g., 1234567890123)"
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-black dark:text-white"
            disabled={isLoading}
          />
          <input
            type="text"
            value={asin}
            onChange={(e) => setAsin(e.target.value)}
            placeholder="ASIN (e.g., B08N5WRWND)"
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-black dark:text-white"
            disabled={isLoading}
          />
          <input
            type="text"
            value={ebayUrl}
            onChange={(e) => setEbayUrl(e.target.value)}
            placeholder="eBay URL"
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-black dark:text-white"
            disabled={isLoading}
          />
          <input
            type="text"
            value={amazonUrl}
            onChange={(e) => setAmazonUrl(e.target.value)}
            placeholder="Amazon URL"
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-black dark:text-white"
            disabled={isLoading}
          />
          <input
            type="text"
            value={currysUrl}
            onChange={(e) => setCurrysUrl(e.target.value)}
            placeholder="Currys URL"
            className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-black dark:text-white"
            disabled={isLoading}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-1 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            isLoading || (!ean && !asin && !ebayUrl && !amazonUrl && !currysUrl)
          }
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? "Scraping..." : "Fetch All"}
        </button>
      </div>
    </form>
  );
}
