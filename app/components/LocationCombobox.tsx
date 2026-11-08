// app/components/forms/sections/LocationCombobox.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface LocationItem {
  id: string; // "bl_205"
  name: string; // "Default"
  type: string; // "bl" | "shop"
  city?: string;
  country?: string;
  is_default: boolean;
}

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// ---- shared fetch (all comboboxes on the page share one request) ----
let cachedPromise: Promise<{
  success?: boolean;
  locations?: LocationItem[];
  error?: string;
}> | null = null;

function getLocations() {
  if (!cachedPromise) {
    cachedPromise = fetch("/api/baselinker-locations")
      .then((r) => r.json())
      .catch((e) => ({
        success: false,
        error: e?.message || "Failed to load locations",
      }));
  }
  return cachedPromise;
}

function humanize(l: LocationItem): string {
  const where = l.city
    ? `${l.city}${l.country ? `, ${l.country}` : ""}`
    : l.country || "";
  return where ? `${l.name} — ${where}` : l.name;
}

export default function LocationCombobox({
  value,
  onChange,
  disabled = false,
  placeholder = "Location",
}: LocationComboboxProps) {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const isFocused = useRef(false);
  const skipNextBlur = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matched = useMemo(
    () => locations.find((l) => l.id === value),
    [locations, value],
  );

  // Sync display from the underlying value, unless the user is actively typing.
  useEffect(() => {
    if (isFocused.current) return;
    setInputValue(matched ? matched.name : value);
  }, [value, matched?.id]);

  // Load warehouses once.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLocations()
      .then((d) => {
        if (cancelled) return;
        if (d.success && Array.isArray(d.locations)) {
          setLocations(d.locations);
          setError(null);
        } else {
          setError(d.error || "Failed to load locations");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q),
    );
  }, [inputValue, locations]);

  // Resolve typed text to a stored value.
  //   1. exact ID match      → save that ID
  //   2. exact name match    → save that warehouse's ID
  //   3. anything else       → save verbatim (custom value)
  const commit = () => {
    const text = inputValue.trim();
    if (!text) {
      if (value !== "") onChange("");
      return;
    }
    const byId = locations.find((l) => l.id === text);
    if (byId) {
      if (value !== byId.id) onChange(byId.id);
      return;
    }
    const byName = locations.find(
      (l) => l.name.toLowerCase() === text.toLowerCase(),
    );
    if (byName) {
      if (value !== byName.id) onChange(byName.id);
      return;
    }
    if (value !== text) onChange(text);
  };

  const handleSelect = (l: LocationItem) => {
    onChange(l.id);
    setInputValue(l.name);
    setOpen(false);
    skipNextBlur.current = true;
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    isFocused.current = false;
    if (skipNextBlur.current) {
      skipNextBlur.current = false;
      return;
    }
    commit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[highlightedIndex];
      if (pick) {
        handleSelect(pick);
      } else {
        commit();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const isCustom =
    !!value && !loading && !error && locations.length > 0 && !matched;

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setHighlightedIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          isFocused.current = true;
          setOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
        title={matched ? `${matched.id} — ${humanize(matched)}` : value}
      />
      {open && !disabled && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg text-sm"
        >
          {filtered.slice(0, 30).map((l, i) => (
            <li key={l.id} role="option" aria-selected={i === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(l)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full text-left px-2 py-1 ${
                  i === highlightedIndex
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {l.is_default && (
                      <span className="text-[9px] text-amber-500 mr-1">★</span>
                    )}
                    {l.name}
                    {(l.city || l.country) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {" "}
                        — {l.city || ""}
                        {l.city && l.country
                          ? `, ${l.country}`
                          : l.country || ""}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 shrink-0">
                    {l.id}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && (
        <p className="text-[10px] text-gray-400 mt-0.5">Loading locations…</p>
      )}
      {error && (
        <p className="text-[10px] text-red-500 mt-0.5" title={error}>
          ⚠ {error} — free-text entry still allowed
        </p>
      )}
      {isCustom && !error && (
        <p className="text-[10px] text-amber-500 mt-0.5">
          ⚠ Not a known Baselinker warehouse — will still be saved as-is.
        </p>
      )}
    </div>
  );
}
