"use client";

import { useState } from "react";
import {
  Loader2,
  X,
  Globe,
  AlertCircle,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";

// All possible fields we can import
const IMPORT_FIELDS = [
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "description", label: "Description" },
  { key: "images", label: "Images" },
  { key: "condition", label: "Condition" },
  { key: "brand", label: "Brand" },
  { key: "mpn", label: "MPN" },
  { key: "sku", label: "SKU" },
  { key: "specifications", label: "Specifications" },
  { key: "shipping", label: "Shipping Info" },
  { key: "returns", label: "Returns" },
];

export default function UniversalImportModal({ isOpen, onClose, onImport }) {
  const [identifiers, setIdentifiers] = useState([
    { id: Date.now(), value: "" },
  ]);
  const [status, setStatus] = useState("idle");
  const [scrapedSources, setScrapedSources] = useState([]);
  const [fieldSelections, setFieldSelections] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const addIdentifierInput = () => {
    setIdentifiers((prev) => [...prev, { id: Date.now(), value: "" }]);
  };

  const removeIdentifierInput = (id) => {
    if (identifiers.length === 1) return;
    setIdentifiers((prev) => prev.filter((item) => item.id !== id));
  };

  const updateIdentifierValue = (id, value) => {
    setIdentifiers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value } : item)),
    );
  };

  const resetModal = () => {
    setIdentifiers([{ id: Date.now(), value: "" }]);
    setStatus("idle");
    setScrapedSources([]);
    setFieldSelections({});
    setErrorMessage("");
  };

  const handleFetch = async (e) => {
    e.preventDefault();
    const values = identifiers
      .map((item) => item.value.trim())
      .filter((v) => v);
    if (values.length === 0) {
      setErrorMessage(
        "Please enter at least one identifier (eBay URL, Amazon ASIN/EAN/URL, Currys URL)",
      );
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    try {
      const response = await fetch("/api/scrape/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: values }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      if (result.data.length === 0) {
        setErrorMessage("No valid product data found for any identifier");
        setStatus("error");
        return;
      }
      setScrapedSources(result.data);
      // Auto-select first source for each field that has a value
      const initialSelections = {};
      for (const field of IMPORT_FIELDS) {
        const availableIndex = result.data.findIndex((src) => {
          if (field.key === "specifications")
            return src.specifications?.length > 0;
          if (field.key === "shipping") return src.shipping;
          if (field.key === "returns") return src.returns;
          return src.product[field.key] && src.product[field.key] !== "";
        });
        if (availableIndex !== -1)
          initialSelections[field.key] = availableIndex;
      }
      setFieldSelections(initialSelections);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message);
    }
  };

  const getFieldValue = (source, fieldKey) => {
    if (fieldKey === "specifications")
      return source.specifications?.length
        ? `${source.specifications.length} specs`
        : null;
    if (fieldKey === "shipping") return source.shipping || null;
    if (fieldKey === "returns") return source.returns || null;
    if (fieldKey === "images")
      return source.product.images?.length
        ? `${source.product.images.length} images`
        : null;
    return source.product[fieldKey] || null;
  };

  const handleImport = () => {
    const finalData = {};
    for (const [fieldKey, sourceIdx] of Object.entries(fieldSelections)) {
      const source = scrapedSources[sourceIdx];
      if (!source) continue;
      let value = null;
      if (fieldKey === "specifications") value = source.specifications;
      else if (fieldKey === "shipping") value = source.shipping;
      else if (fieldKey === "returns") value = source.returns;
      else if (fieldKey === "images") value = source.product.images;
      else value = source.product[fieldKey];
      if (value !== null && value !== undefined && value !== "") {
        finalData[fieldKey] = value;
      }
    }
    onImport(finalData);
    onClose();
    resetModal();
  };

  const allFieldsSelected = () => {
    const availableFields = IMPORT_FIELDS.filter((field) => {
      return scrapedSources.some(
        (src) => getFieldValue(src, field.key) !== null,
      );
    });
    return availableFields.every(
      (field) => fieldSelections[field.key] !== undefined,
    );
  };

  if (!isOpen) return null;

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-500">
            <Globe className="w-5 h-5" />
            <h3 className="text-lg font-bold">Universal Product Import</h3>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isSuccess ? (
            <form onSubmit={handleFetch} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product Identifiers
                </label>
                <p className="text-xs text-gray-500">
                  Enter eBay URLs, Amazon URLs/ASIN/EAN, or Currys URLs
                </p>
                <div className="space-y-2">
                  {identifiers.map((item, idx) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) =>
                          updateIdentifierValue(item.id, e.target.value)
                        }
                        placeholder={`e.g., https://www.ebay.co.uk/itm/..., B08N5WRWND, 1234567890123, https://www.currys.co.uk/...`}
                        className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-black dark:text-white"
                        disabled={isLoading}
                        autoFocus={idx === 0}
                      />
                      {identifiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIdentifierInput(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addIdentifierInput}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4" /> Add another identifier
                </button>
              </div>

              {isError && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isLoading || identifiers.every((i) => !i.value.trim())
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? "Scraping..." : "Fetch All"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Sources summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="font-medium mb-2">Sources found:</div>
                <div className="flex flex-wrap gap-2">
                  {scrapedSources.map((src, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs capitalize"
                    >
                      #{idx + 1}: {src.source}
                    </span>
                  ))}
                </div>
              </div>

              {/* Field selection table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left">Field</th>
                      {scrapedSources.map((src, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-2 text-left font-normal"
                        >
                          <span className="capitalize">{src.source}</span>
                          <div className="text-xs text-gray-500">
                            {src.identifier?.substring(0, 30)}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-2 text-left">Selected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IMPORT_FIELDS.map((field) => {
                      const availableOptions = [];
                      scrapedSources.forEach((src, idx) => {
                        const val = getFieldValue(src, field.key);
                        if (val !== null) availableOptions.push({ idx, val });
                      });
                      if (availableOptions.length === 0) return null;
                      const currentSelection = fieldSelections[field.key];
                      return (
                        <tr
                          key={field.key}
                          className="border-t dark:border-gray-700"
                        >
                          <td className="px-4 py-2 font-medium">
                            {field.label}
                          </td>
                          {scrapedSources.map((_, idx) => {
                            const val = getFieldValue(
                              scrapedSources[idx],
                              field.key,
                            );
                            return (
                              <td key={idx} className="px-4 py-2">
                                {val ? (
                                  <div
                                    className="max-w-xs truncate"
                                    title={
                                      typeof val === "string"
                                        ? val
                                        : JSON.stringify(val)
                                    }
                                  >
                                    {typeof val === "string"
                                      ? val
                                      : val.length
                                        ? `${val.length} items`
                                        : "✓"}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2">
                            <select
                              value={
                                currentSelection !== undefined
                                  ? currentSelection
                                  : ""
                              }
                              onChange={(e) =>
                                setFieldSelections((prev) => ({
                                  ...prev,
                                  [field.key]: parseInt(e.target.value),
                                }))
                              }
                              className="p-1 border rounded dark:bg-gray-800"
                            >
                              <option value="" disabled>
                                Choose source
                              </option>
                              {availableOptions.map((opt) => (
                                <option key={opt.idx} value={opt.idx}>
                                  Source {opt.idx + 1}: {opt.val}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    resetModal();
                    setStatus("idle");
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!allFieldsSelected()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium"
                >
                  Import Selected Fields
                </button>
              </div>
              {!allFieldsSelected() && (
                <p className="text-xs text-amber-600">
                  Please select a source for each available field
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
