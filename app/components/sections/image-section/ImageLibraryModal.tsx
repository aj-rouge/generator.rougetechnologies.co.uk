"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, X, Check, ImageIcon, ArrowLeft } from "lucide-react";
import { useDebounce } from "../../../utils/useDebounce";

interface ImportedImage {
  url: string;
  sourceS3Path: string;
}

interface LibrarySearchResult {
  id: string;
  title: string;
  sku?: string | null;
  category?: string | null;
}

interface LibraryProductImage {
  image_order: number;
  url: string;
  s3_path: string | null;
  alt_text: string | null;
}

interface SearchApiResponse {
  results: LibrarySearchResult[];
}

interface ProductImagesApiResponse {
  images: LibraryProductImage[];
}

export default function ImageLibraryModal({
  onClose,
  onImport,
  maxSelectable = 16,
}: {
  onClose: () => void;
  onImport: (images: ImportedImage[]) => void;
  maxSelectable?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibrarySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<LibrarySearchResult | null>(null);
  const [productImages, setProductImages] = useState<LibraryProductImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const debounced = useDebounce(query, 300);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Search failed: ${r.status}`);
        return (await r.json()) as SearchApiResponse; // ← cast
      })
      .then((d) => setResults(d.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  const openProduct = async (p: LibrarySearchResult) => {
    setSelectedProduct(p);
    setLoadingImages(true);
    setPicked(new Set());
    try {
      const res = await fetch(`/api/product/${p.id}/images`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as ProductImagesApiResponse; // ← cast
      setProductImages(data.images || []);
    } catch {
      setProductImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const toggle = (key: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < maxSelectable) next.add(key);
      return next;
    });
  };

  const confirm = () => {
    const chosen = productImages.filter((img) =>
      picked.has(img.s3_path || img.url),
    );
    onImport(
      chosen.map((img) => ({
        url: img.url,
        sourceS3Path: img.s3_path || img.url,
      })),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {selectedProduct && (
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setProductImages([]);
                  setPicked(new Set());
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {selectedProduct
                ? selectedProduct.title
                : "Import Images from Library"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: search + product list */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Title, SKU, EAN, ASIN..."
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="p-4 flex justify-center">
                  <Loader2 className="animate-spin w-5 h-5" />
                </div>
              )}
              {!loading && query.length >= 2 && results.length === 0 && (
                <p className="p-4 text-sm text-gray-500 text-center">
                  No products found
                </p>
              )}
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedProduct?.id === p.id
                      ? "bg-blue-50 dark:bg-blue-900/30"
                      : ""
                  }`}
                >
                  <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {p.sku ? `SKU: ${p.sku} • ` : ""}
                    {p.category}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right: image grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedProduct ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <ImageIcon size={48} />
                <p className="mt-3 text-sm">
                  Pick a product on the left to view its images
                </p>
              </div>
            ) : loadingImages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin w-6 h-6" />
              </div>
            ) : productImages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                This product has no images
              </div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between text-xs text-gray-500">
                  <span>{productImages.length} image(s)</span>
                  <span>{picked.size} selected</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 md:grid-cols-4 gap-3">
                  {productImages.map((img, idx) => {
                    const key = img.s3_path || img.url || `i-${idx}`;
                    const isPicked = picked.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggle(key)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          isPicked
                            ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.alt_text || ""}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                        {isPicked && (
                          <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={picked.size === 0}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {picked.size || ""} image{picked.size === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
