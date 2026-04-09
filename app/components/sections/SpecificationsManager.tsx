"use client";

import { useState } from "react";
import {
  VALIDATION_COLORS,
  getBorderColorFromScore,
} from "../../utils/ui/validationColors";
import { calculateValidationScore } from "../../utils/ui/validationHelpers";
import { ValidationWrapper } from "./ValidationWrapper";
import { StatusHeader } from "./StatusHeader";
import { ValidationRules } from "./ValidationRules";

// Helper to generate a unique ID for each spec row
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function SpecificationsManager({
  specifications = [],
  setSpecifications,
  categoryKeywords = [],
}) {
  const [editingId, setEditingId] = useState(null);
  const [tempKey, setTempKey] = useState("");
  const [tempValue, setTempValue] = useState("");

  // Add a new empty row and enter edit mode
  const handleAddSpec = () => {
    const newId = generateId();
    const newSpec = { id: newId, key: "", value: "" };
    setSpecifications([...specifications, newSpec]);
    setEditingId(newId);
    setTempKey("");
    setTempValue("");
  };

  // Save the currently edited row
  const handleSaveEdit = () => {
    if (!tempKey.trim() || !tempValue.trim()) return;
    setSpecifications(
      specifications.map((spec) =>
        spec.id === editingId
          ? { ...spec, key: tempKey.trim(), value: tempValue.trim() }
          : spec,
      ),
    );
    setEditingId(null);
    setTempKey("");
    setTempValue("");
  };

  // Cancel editing
  const handleCancelEdit = () => {
    const editedSpec = specifications.find((s) => s.id === editingId);
    if (editedSpec && !editedSpec.key && !editedSpec.value) {
      setSpecifications(specifications.filter((s) => s.id !== editingId));
    }
    setEditingId(null);
    setTempKey("");
    setTempValue("");
  };

  // Start editing an existing row
  const handleEdit = (spec) => {
    setEditingId(spec.id);
    setTempKey(spec.key);
    setTempValue(spec.value);
  };

  // Delete a specification
  const handleDelete = (id) => {
    setSpecifications(specifications.filter((spec) => spec.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setTempKey("");
      setTempValue("");
    }
  };

  // Move a spec up/down
  const handleMove = (index, direction) => {
    const newSpecs = [...specifications];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSpecs.length) return;
    [newSpecs[index], newSpecs[targetIndex]] = [
      newSpecs[targetIndex],
      newSpecs[index],
    ];
    setSpecifications(newSpecs);
  };

  // Validation rules
  const validationRules = [
    {
      id: 1,
      name: "At least one specification",
      description: "Add at least one key-value pair",
      check: () => specifications.length > 0,
      importance: "critical",
      errorMessage:
        specifications.length === 0
          ? "❌ Add at least one specification"
          : null,
    },
    {
      id: 2,
      name: "All keys filled",
      description: "Every specification must have a non‑empty key",
      check: () => specifications.every((spec) => spec.key.trim() !== ""),
      importance: "critical",
      condition: specifications.length > 0,
      errorMessage: specifications.some((s) => !s.key.trim())
        ? "❌ All keys must be filled"
        : null,
    },
    {
      id: 3,
      name: "All values filled",
      description: "Every specification must have a non‑empty value",
      check: () => specifications.every((spec) => spec.value.trim() !== ""),
      importance: "critical",
      condition: specifications.length > 0,
      errorMessage: specifications.some((s) => !s.value.trim())
        ? "❌ All values must be filled"
        : null,
    },
    {
      id: 4,
      name: "Unique keys",
      description: "Specification keys should be unique (case‑insensitive)",
      check: () => {
        const keys = specifications.map((s) => s.key.trim().toLowerCase());
        return keys.length === new Set(keys).size;
      },
      importance: "warning",
      condition: specifications.length > 1,
      errorMessage: "⚠️ Duplicate keys found – consider merging or renaming",
    },
  ];

  const displayRules = validationRules.filter(
    (rule) => rule.condition !== false,
  );
  const { passedRules, totalRules, allRulesPass, validationScore } =
    calculateValidationScore(displayRules);

  const getOverallStatus = () => {
    if (specifications.length === 0) return "⚠️ No specifications";
    if (allRulesPass) return "✓ Complete";
    return "⚠️ Incomplete";
  };

  const getHeaderIcon = () => {
    if (specifications.length === 0) return VALIDATION_COLORS.icon.critical;
    if (allRulesPass) return VALIDATION_COLORS.icon.success;
    return VALIDATION_COLORS.icon.warning;
  };

  // Compute borderColor from validationScore (same logic as inside ValidationWrapper)
  const borderColorClass = getBorderColorFromScore(validationScore);

  // Compute statusColor based on overall status and severity
  // We reuse the same logic that StatusHeader would use internally,
  // but we pass it explicitly to satisfy TypeScript.
  const getStatusColor = () => {
    if (specifications.length === 0)
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    if (allRulesPass)
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  };

  return (
    <ValidationWrapper
      validationScore={validationScore}
      borderColor={borderColorClass} // ✅ required prop added
    >
      <StatusHeader
        title="Item Specifics"
        status={getOverallStatus()}
        rulesPassed={passedRules}
        totalRules={totalRules}
        subtitle="Add details about product"
        statusColor={getStatusColor()} // ✅ required prop added
      />

      <div className="space-y-4">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          <div className="col-span-5">Specification</div>
          <div className="col-span-5">Value</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* List of specifications */}
        {specifications.map((spec, idx) => (
          <div
            key={spec.id}
            className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 rounded-lg border ${
              editingId === spec.id
                ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            }`}
          >
            {editingId === spec.id ? (
              <>
                <div className="md:col-span-5">
                  <input
                    type="text"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="e.g., Processor, Screen Size, Brand"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    autoFocus
                  />
                </div>
                <div className="md:col-span-5">
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    placeholder="e.g., Intel Core i7, 15.6 inch, Apple"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="md:col-span-5 font-medium text-gray-800 dark:text-gray-200 break-words">
                  {spec.key || "—"}
                </div>
                <div className="md:col-span-5 text-gray-600 dark:text-gray-400 break-words">
                  {spec.value || "—"}
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(spec)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(spec.id)}
                    className="text-red-600 dark:text-red-400 hover:underline text-sm"
                  >
                    Delete
                  </button>
                  <div className="flex gap-1">
                    {idx > 0 && (
                      <button
                        onClick={() => handleMove(idx, "up")}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        title="Move up"
                      >
                        ↑
                      </button>
                    )}
                    {idx < specifications.length - 1 && (
                      <button
                        onClick={() => handleMove(idx, "down")}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        title="Move down"
                      >
                        ↓
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add button */}
        <button
          onClick={handleAddSpec}
          className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + Add specification
        </button>
      </div>

      <ValidationRules
        rules={displayRules}
        headerIcon={getHeaderIcon()}
        headerText="Specifications Requirements"
        validationScore={validationScore}
        allRulesPass={allRulesPass}
        passedRules={passedRules}
        totalRules={totalRules}
        overallStatusMessage={
          specifications.length === 0
            ? "Add at least one spec"
            : allRulesPass
              ? "Perfect!"
              : "Needs work"
        }
      />
    </ValidationWrapper>
  );
}
