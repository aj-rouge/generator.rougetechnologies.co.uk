// app/components/forms/ProductFormHeader.tsx (wrapper)
"use client";

import { useState, useEffect } from "react";
import { DesktopProductHeader } from "./DesktopProductHeader";
import { MobileProductHeader } from "./MobileProductHeader";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}

interface ProductFormHeaderProps {
  mode: "edit" | "create" | string;
  title: string;
  isSaving: boolean;
  isFormValid: boolean;
  shouldShowSave: boolean;
  onSave: () => void;
  selectedCategory?: string;
  hasPendingUploads?: boolean;
  uuid?: string;
  baselinkerId?: string;
  shopifyId?: string;
  onBaselinkerCreated?: (id: string) => void;
  onUniversalImport?: (data: any) => void;
  condition?: string;
  categoryKeywords?: string[];
  isComplete: boolean;
}

export default function ProductFormHeader(props: ProductFormHeaderProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return <MobileProductHeader {...props} />;
  }
  return <DesktopProductHeader {...props} />;
}
