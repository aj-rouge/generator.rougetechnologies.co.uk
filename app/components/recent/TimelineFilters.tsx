// components/recent/TimelineFilters.tsx
"use client";

import { useState, useEffect } from "react";
import {
  CountFiltersType,
  IdentifierField,
  IdentifierRule,
} from "../../utils/d1/getRecentProducts";
import { DesktopFilters } from "./DesktopFilters";
import { MobileFiltersBar, MobileFiltersSheet } from "./MobileFilters";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
type SortField = "updated_at" | "created_at";
type SortOrder = "DESC" | "ASC";
type LimitOption = 5 | 10 | 20 | 50 | 100 | 200 | 500;

interface SortState {
  field: SortField;
  order: SortOrder;
  toggleOrder: () => void;
  setField: (field: SortField) => void;
}

interface PaginationState {
  limit: LimitOption;
  setLimit: (limit: LimitOption) => void;
}

interface CategoryFilterState {
  categories: any[];
  selected: string;
  setSelected: (category: string) => void;
}

interface IdentifierRulesState {
  rules: Partial<Record<IdentifierField, IdentifierRule>>;
  setRules: (rules: Partial<Record<IdentifierField, IdentifierRule>>) => void;
}

interface CountFiltersState {
  filters: CountFiltersType;
  setFilters: (filters: CountFiltersType) => void;
}

interface TimelineFiltersProps {
  sort: SortState;
  pagination: PaginationState;
  categoryFilter: CategoryFilterState;
  identifierRules: IdentifierRulesState;
  countFilters: CountFiltersState;
  loading: boolean;
  fetchRecent: () => void;
  onClearFilters: () => void;
}

// ----------------------------------------------------------------------------
// useMediaQuery hook
// ----------------------------------------------------------------------------
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}

// ----------------------------------------------------------------------------
// Main TimelineFilters component
// ----------------------------------------------------------------------------
export const TimelineFilters = (props: TimelineFiltersProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobile && isMobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isMobileFiltersOpen]);

  if (!isMobile) {
    return <DesktopFilters {...props} />;
  }

  return (
    <>
      <MobileFiltersBar
        loading={props.loading}
        fetchRecent={props.fetchRecent}
        onOpenSheet={() => setIsMobileFiltersOpen(true)}
      />
      <MobileFiltersSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        filtersProps={props}
      />
    </>
  );
};
