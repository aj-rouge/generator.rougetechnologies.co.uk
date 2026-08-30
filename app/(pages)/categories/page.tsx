"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNotification } from "../../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Edit,
  Save,
  X,
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  FileText,
  Tag,
  Link as LinkIcon,
  Layers,
  Home,
} from "lucide-react";

// ---------- Types ----------
interface ConditionGroup {
  group_key: string;
  group_name: string;
  options: string[];
}

interface Category {
  id: number;
  slug: string;
  name: string;
  parent_category: string | null;
  condition_group_id: number | null;
  ebay_store_link: string | null;
  keywords: string[];
  created_at: number;
  updated_at: number;
  product_count: number;
  condition_group: ConditionGroup | null;
  children: Category[];
}

interface CategoryContent {
  subheading: string | null;
  paragraphs: string[];
}

interface CategoryFull extends Category {
  content: CategoryContent[] | null;
}

// ---------- Helpers ----------
function safeJSONParse<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

// ---------- Skeleton ----------
function CategoriesSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-2 border-b border-gray-200 dark:border-gray-700"
              >
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFull | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { addNotification } = useNotification();

  // Editing state
  const [editName, setEditName] = useState("");
  const [editEbayLink, setEditEbayLink] = useState("");
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editConditionGroupId, setEditConditionGroupId] = useState<
    number | null
  >(null);
  const [editContent, setEditContent] = useState<CategoryContent[]>([]);
  const [availableConditionGroups, setAvailableConditionGroups] = useState<
    ConditionGroup[]
  >([]);

  // Load categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch categories tree
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      // In fetchCategories()
      const data = (await res.json()) as Category[];
      console.log("Raw categories data:", JSON.stringify(data, null, 2));

      setCategories(data);
    } catch (err: any) {
      addNotification({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch full category details (with content)
  const fetchCategoryDetail = async (slug: string) => {
    setFetchingDetail(true);
    try {
      const res = await fetch(`/api/categories/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch category details");
      const data: CategoryFull = await res.json();
      setSelectedCategory(data);
      setEditName(data.name);
      setEditEbayLink(data.ebay_store_link || "");
      setEditKeywords(data.keywords || []);
      setEditConditionGroupId(data.condition_group_id);
      setEditContent(data.content || []);
      // Also collect all condition groups from the tree? We'll need a separate endpoint or extract from categories.
      // For simplicity, we'll collect from the loaded tree.
      const groups = collectConditionGroups(categories);
      setAvailableConditionGroups(groups);
    } catch (err: any) {
      addNotification({ message: err.message, type: "error" });
    } finally {
      setFetchingDetail(false);
    }
  };

  // Helper to collect unique condition groups from categories
  const collectConditionGroups = (cats: Category[]): ConditionGroup[] => {
    const map = new Map<string, ConditionGroup>();
    const traverse = (nodes: Category[]) => {
      for (const cat of nodes) {
        if (cat.condition_group) {
          map.set(cat.condition_group.group_key, cat.condition_group);
        }
        if (cat.children) traverse(cat.children);
      }
    };
    traverse(cats);
    return Array.from(map.values());
  };

  // Handle category selection
  const handleSelectCategory = (slug: string) => {
    if (selectedSlug === slug) {
      // Deselect? We'll keep selected.
      return;
    }
    setSelectedSlug(slug);
    fetchCategoryDetail(slug);
  };

  // Toggle expand
  const toggleExpand = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Render tree recursively
  const renderTree = (nodes: Category[], level = 0) => {
    return nodes.map((cat) => {
      const hasChildren = cat.children && cat.children.length > 0;
      return (
        <div key={cat.slug} style={{ paddingLeft: level * 16 }}>
          <div
            className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
              selectedSlug === cat.slug ? "bg-blue-50 dark:bg-blue-900/30" : ""
            }`}
            onClick={() => handleSelectCategory(cat.slug)}
          >
            {/* Only render chevron if has children */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(cat.slug);
                }}
                className="p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {expanded.has(cat.slug) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              // Add a placeholder to keep alignment consistent
              <span className="w-5 h-5" />
            )}
            {expanded.has(cat.slug) ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-sm font-medium">{cat.name}</span>
            <span className="text-xs text-gray-400 ml-auto">
              ({cat.product_count})
            </span>
          </div>
          {hasChildren && expanded.has(cat.slug) && (
            <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-3">
              {renderTree(cat.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Save category
  const handleSave = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    try {
      const payload = {
        name: editName,
        ebay_store_link: editEbayLink || null,
        keywords: editKeywords,
        condition_group_id: editConditionGroupId,
        content: editContent,
      };
      const res = await fetch(`/api/categories/${selectedSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }; // ✅ 修复这里
        throw new Error(err.error || "Update failed");
      }
      addNotification({
        message: "Category updated successfully",
        type: "success",
      });
      await fetchCategories();
      if (selectedSlug) {
        await fetchCategoryDetail(selectedSlug);
      }
    } catch (err) {
      const error = err as any;
      addNotification({
        message: error.message || error.error || "Update failed",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };
  // Content editing helpers
  const updateContent = (
    index: number,
    field: "subheading" | "paragraphs",
    value: any,
  ) => {
    const newContent = [...editContent];
    if (field === "subheading") {
      newContent[index].subheading = value || null;
    } else if (field === "paragraphs") {
      newContent[index].paragraphs = value;
    }
    setEditContent(newContent);
  };

  const addContentSection = () => {
    setEditContent([...editContent, { subheading: null, paragraphs: [""] }]);
  };

  const removeContentSection = (index: number) => {
    setEditContent(editContent.filter((_, i) => i !== index));
  };

  const addParagraph = (index: number) => {
    const newContent = [...editContent];
    newContent[index].paragraphs.push("");
    setEditContent(newContent);
  };

  const updateParagraph = (
    sectionIdx: number,
    paraIdx: number,
    value: string,
  ) => {
    const newContent = [...editContent];
    newContent[sectionIdx].paragraphs[paraIdx] = value;
    setEditContent(newContent);
  };

  const removeParagraph = (sectionIdx: number, paraIdx: number) => {
    const newContent = [...editContent];
    newContent[sectionIdx].paragraphs.splice(paraIdx, 1);
    setEditContent(newContent);
  };

  // Keyword management
  const addKeyword = (keyword: string) => {
    if (!keyword.trim()) return;
    if (editKeywords.includes(keyword.trim())) return;
    setEditKeywords([...editKeywords, keyword.trim()]);
  };

  const removeKeyword = (keyword: string) => {
    setEditKeywords(editKeywords.filter((k) => k !== keyword));
  };

  if (loading) return <CategoriesSkeleton />;

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-4">
      <div className="w-full flex justify-between items-center">
        <motion.h1
          className="text-3xl font-bold flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Layers className="w-8 h-8 text-purple-500" />
          Category Management
        </motion.h1>
        <Link
          href="/"
          className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 self-start sticky top-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Categories
            </h2>
            <div className="overflow-auto max-h-[70vh]">
              {renderTree(categories)}
            </div>
          </div>
        </div>
        {/* Detail panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedCategory ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow px-6"
              >
                {fetchingDetail ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4 self-start sticky top-0 bg-white dark:bg-gray-800 z-10 py-4 rounded-md shadow">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          {selectedCategory.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Slug: <code>{selectedCategory.slug}</code>
                        </p>
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center gap-2 transition disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* eBay Store Link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          eBay Store Link
                        </label>
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-gray-400" />
                          <input
                            type="url"
                            value={editEbayLink}
                            onChange={(e) => setEditEbayLink(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      {/* Keywords */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Keywords
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {editKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="inline-flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm"
                            >
                              <Tag className="w-3 h-3" />
                              {kw}
                              <button
                                onClick={() => removeKeyword(kw)}
                                className="text-gray-500 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add keyword..."
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addKeyword(
                                  (e.target as HTMLInputElement).value,
                                );
                                (e.target as HTMLInputElement).value = "";
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = (
                                e.target as HTMLElement
                              ).parentElement?.querySelector("input");
                              if (input) {
                                addKeyword(input.value);
                                input.value = "";
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Condition Group */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Condition Group
                        </label>
                        <select
                          value={editConditionGroupId || ""}
                          onChange={(e) =>
                            setEditConditionGroupId(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">None</option>
                          {availableConditionGroups.map((g) => (
                            <option key={g.group_key} value={g.group_key}>
                              {g.group_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Content sections */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Content Sections
                          </label>
                          <button
                            onClick={addContentSection}
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add Section
                          </button>
                        </div>
                        {editContent.length === 0 && (
                          <p className="text-sm text-gray-400">
                            No content sections.
                          </p>
                        )}
                        {editContent.map((section, idx) => (
                          <div
                            key={idx}
                            className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">
                                Section {idx + 1}
                              </span>
                              <button
                                onClick={() => removeContentSection(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mb-2">
                              <label className="block text-xs text-gray-500 dark:text-gray-400">
                                Subheading (optional)
                              </label>
                              <input
                                type="text"
                                value={section.subheading || ""}
                                onChange={(e) =>
                                  updateContent(
                                    idx,
                                    "subheading",
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Subheading"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400">
                                Paragraphs
                              </label>
                              {section.paragraphs.map((para, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex items-start gap-2 mb-1"
                                >
                                  <textarea
                                    value={para}
                                    onChange={(e) =>
                                      updateParagraph(idx, pIdx, e.target.value)
                                    }
                                    rows={8}
                                    className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Paragraph text..."
                                  />
                                  <button
                                    onClick={() => removeParagraph(idx, pIdx)}
                                    className="mt-1 text-red-500 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => addParagraph(idx)}
                                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                                Add paragraph
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex items-center justify-center h-64 text-gray-400"
              >
                Select a category to view and edit details.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
