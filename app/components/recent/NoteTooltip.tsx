"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { StickyNote } from "lucide-react";

interface NoteTooltipProps {
  note: string;
}

export const NoteTooltip = ({ note }: NoteTooltipProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  const updateTooltipPosition = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top, // will offset via transform
        left: rect.left + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    if (showTooltip) {
      updateTooltipPosition();
      window.addEventListener("scroll", updateTooltipPosition, true);
      window.addEventListener("resize", updateTooltipPosition);
      return () => {
        window.removeEventListener("scroll", updateTooltipPosition, true);
        window.removeEventListener("resize", updateTooltipPosition);
      };
    }
  }, [showTooltip]);

  return (
    <>
      <div
        ref={badgeRef}
        className="relative inline-flex group flex-shrink-0"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-[9px] font-bold text-amber-700 dark:text-amber-400 cursor-help">
          <StickyNote className="w-2.5 h-2.5" />
          NOTE
        </div>
      </div>

      {showTooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: "translateX(-50%) translateY(calc(-100% - 8px))",
              zIndex: 9999,
            }}
            className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-w-xs whitespace-normal break-words"
          >
            {note}
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700"
              style={{ borderColor: "inherit" }}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
