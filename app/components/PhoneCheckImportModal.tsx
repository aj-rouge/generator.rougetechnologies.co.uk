"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  X,
  Upload,
  Loader2,
  Check,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";

// Define the response from the import API
interface ImportApiResponse {
  success: boolean;
  results: Array<{
    success: boolean;
    sku: string;
    title: string;
    error?: string;
    id?: string;
  }>;
  error?: string;
}

interface PhoneCheckRecord {
  make: string;
  model: string;
  modelNumber: string;
  memory: string;
  color: string;
  grade: string;
  batteryHealth: string;
  working: string;
  lpn: string;
  note: string;
  failed: string;
}

interface ImportRow extends PhoneCheckRecord {
  id: string;
  selected: boolean;
  generatedTitle: string;
  generatedSku: string;
  error?: string; // validation error from CSV
  importError?: string; // error from import API
}

interface PhoneCheckImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onImportComplete: () => void;
}

export default function PhoneCheckImportModal({
  isOpen,
  onClose,
  categories,
  onImportComplete,
}: PhoneCheckImportModalProps) {
  const { addNotification } = useNotification();

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setSelectedCategory("");
    setIsProcessing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      addNotification({ message: "Please upload a CSV file", type: "error" });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const data = result.data as any[];
        if (data.length === 0) {
          addNotification({ message: "CSV is empty", type: "error" });
          return;
        }

        const mappedRows: ImportRow[] = data.map((row: any, index) => {
          const make = row["Make"] || "";
          const model = row["Model"] || "";
          const modelNumber = row["Model Number"] || "";
          const memory = row["Memory"] || "";
          const color = row["Color"] || "";
          const grade = row["Grade"] || "";
          const batteryHealth = row["Battery Health Percentage"] || "";
          const working = row["100% Working"] || "";
          const lpn = row["LPN"] || "";
          const note = row["Notes"] || "";
          const failed = row["Failed"] || "";

          const errors: string[] = [];
          if (!make) errors.push("Make missing");
          if (!model) errors.push("Model missing");
          if (!color) errors.push("Color missing");
          if (!memory) errors.push("Memory missing");
          if (!grade) errors.push("Grade missing");
          if (!lpn) errors.push("LPN missing");

          const error = errors.length > 0 ? errors.join("; ") : undefined;

          return {
            id: `row-${index}`,
            make,
            model,
            modelNumber,
            memory,
            color,
            grade,
            batteryHealth,
            working,
            lpn,
            note,
            failed,
            selected: !error && working === "Yes" && grade !== "PARTS",
            generatedTitle: generateTitle(
              make,
              model,
              color,
              memory,
              batteryHealth,
            ),
            generatedSku: generateSku(make, model, memory, color, lpn, grade),
            error,
            importError: undefined,
          };
        });

        setRows(mappedRows);
      },
      error: (err) => {
        addNotification({
          message: `CSV parsing error: ${err.message}`,
          type: "error",
        });
      },
    });
  };

  // Helper functions (same as in API)
  const sanitiseForSku = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 4);

  const generateSku = (
    make: string,
    model: string,
    memory: string,
    color: string,
    lpn: string,
    grade: string,
  ) => {
    const makePart = sanitiseForSku(make) || "XXXX";
    const modelPart = sanitiseForSku(model) || "XXXX";
    const colorPart = sanitiseForSku(color) || "XXXX";
    const memoryClean = memory.replace(/\s/g, "").toUpperCase();
    const lpnClean = lpn.replace(/[^A-Z0-9]/g, "").toUpperCase();
    const gradeClean = grade.replace(/[^A-Z0-9-]/g, "").toUpperCase();
    return `${makePart}-PHO-${modelPart}-${memoryClean}-${colorPart}-${lpnClean}-${gradeClean}`;
  };

  const generateTitle = (
    make: string,
    model: string,
    color: string,
    memory: string,
    batteryHealth: string,
  ) => {
    const battery = parseInt(batteryHealth, 10) || 0;
    return `${make} ${model} ${color} ${memory} ${battery}% Fully Working`;
  };

  const toggleRow = (id: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row,
      ),
    );
  };

  const updateField = (
    id: string,
    field: "generatedTitle" | "generatedSku",
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [field]: value, importError: undefined } // clear import error when editing
          : row,
      ),
    );
  };

  const handleImport = async () => {
    const selectedRows = rows.filter((r) => r.selected && !r.error);
    if (selectedRows.length === 0) {
      addNotification({ message: "No rows selected", type: "error" });
      return;
    }
    if (!selectedCategory) {
      addNotification({ message: "Please select a category", type: "error" });
      return;
    }

    setIsProcessing(true);
    try {
      const records = selectedRows.map((row) => ({
        make: row.make,
        model: row.model,
        color: row.color,
        memory: row.memory,
        grade: row.grade,
        batteryHealth: row.batteryHealth,
        working: row.working,
        lpn: row.lpn,
        note: row.note,
        failed: row.failed,
        title: row.generatedTitle,
        sku: row.generatedSku,
      }));

      const res = await fetch("/api/phonecheck/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, categorySlug: selectedCategory }),
      });

      const result = (await res.json()) as ImportApiResponse;
      if (!result.success) throw new Error(result.error || "Import failed");

      const { results } = result;
      const successMap = new Map();
      const failureMap = new Map();
      results.forEach((r) => {
        if (r.success) successMap.set(r.sku, r);
        else failureMap.set(r.sku, r);
      });

      // Update rows: keep only failed ones, mark with importError
      const updatedRows = rows
        .map((row) => {
          if (!row.selected || row.error) return row; // not selected or already invalid
          if (successMap.has(row.generatedSku)) {
            // Succeeded: remove from list
            return null;
          } else if (failureMap.has(row.generatedSku)) {
            const fail = failureMap.get(row.generatedSku);
            return { ...row, importError: fail.error || "Unknown error" };
          }
          // Should not happen, but keep just in case
          return row;
        })
        .filter((row): row is ImportRow => row !== null);

      const successCount = successMap.size;
      const failureCount = failureMap.size;

      if (failureCount > 0) {
        // Keep modal open, show warning
        setRows(updatedRows);
        addNotification({
          message: `Imported ${successCount} product(s), ${failureCount} failed. Please review errors below.`,
          type: "warning",
          duration: 8000,
        });
      } else {
        // All succeeded
        addNotification({
          message: `Successfully imported ${successCount} product(s).`,
          type: "success",
        });
        onImportComplete();
        handleClose();
      }
    } catch (err: any) {
      addNotification({
        message: `Import failed: ${err.message}`,
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Import from PhoneCheck CSV
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category for imported products
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              disabled={isProcessing}
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* File drop zone */}
          {rows.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Drag and drop a CSV file here, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Make</th>
                    <th className="p-2 text-left">Model</th>
                    <th className="p-2 text-left">Memory</th>
                    <th className="p-2 text-left">Color</th>
                    <th className="p-2 text-left">Grade</th>
                    <th className="p-2 text-left">Battery</th>
                    <th className="p-2 text-left">Working</th>
                    <th className="p-2 text-left">LPN</th>
                    <th className="p-2 text-left min-w-[120px]">Title</th>
                    <th className="p-2 text-left min-w-[120px]">SKU</th>
                    <th className="p-2 text-center">Select</th>
                    <th className="p-2 text-left min-w-[150px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.error || row.importError
                          ? "bg-red-50 dark:bg-red-950/20"
                          : ""
                      }
                    >
                      <td className="p-2">{row.id.split("-")[1]}</td>
                      <td className="p-2">{row.make}</td>
                      <td className="p-2">{row.model}</td>
                      <td className="p-2">{row.memory}</td>
                      <td className="p-2">{row.color}</td>
                      <td className="p-2">{row.grade}</td>
                      <td className="p-2">{row.batteryHealth}</td>
                      <td className="p-2">{row.working}</td>
                      <td className="p-2">{row.lpn}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.generatedTitle}
                          onChange={(e) =>
                            updateField(
                              row.id,
                              "generatedTitle",
                              e.target.value,
                            )
                          }
                          className="w-full px-1 py-0.5 border rounded dark:bg-gray-800 dark:border-gray-600"
                          disabled={isProcessing}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.generatedSku}
                          onChange={(e) =>
                            updateField(row.id, "generatedSku", e.target.value)
                          }
                          className="w-full px-1 py-0.5 border rounded dark:bg-gray-800 dark:border-gray-600 font-mono text-xs"
                          disabled={isProcessing}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(row.id)}
                          disabled={!!row.error || isProcessing}
                          className="accent-blue-600"
                        />
                      </td>
                      <td className="p-2 text-xs">
                        {row.error && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {row.error}
                          </span>
                        )}
                        {row.importError && (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {row.importError}
                          </span>
                        )}
                        {row.selected && !row.error && !row.importError && (
                          <span className="text-green-600">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300"
            disabled={isProcessing}
          >
            Cancel
          </button>
          {rows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={
                isProcessing ||
                !selectedCategory ||
                rows.filter((r) => r.selected && !r.error && !r.importError)
                  .length === 0
              }
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Import Selected (
                  {
                    rows.filter((r) => r.selected && !r.error && !r.importError)
                      .length
                  }
                  )
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
