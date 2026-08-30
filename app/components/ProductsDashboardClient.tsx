// components/ProductsDashboardClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  LogOut,
  FileText,
  LayoutDashboard,
  Layers,
  Menu,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { DarkModeToggle } from "./header/DarkModeToggle";
import RecentProducts from "./recent/RecentProducts";
import SearchBar from "./search/SearchBar";

interface ProductsDashboardClientProps {
  initialProducts: any[];
  categories: any[];
  initialCountFilters: any;
}

export default function ProductsDashboardClient({
  initialProducts,
  categories,
  initialCountFilters,
}: ProductsDashboardClientProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dropdown animation variants
  const dropdownVariants: Variants = {
    hidden: {
      opacity: 0,
      y: -8,
      scale: 0.95,
      transition: { duration: 0.15, ease: "easeOut" },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut",
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.95,
      transition: { duration: 0.1, ease: "easeIn" },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -6 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.15 } },
    exit: { opacity: 0, x: -6, transition: { duration: 0.1 } },
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen">
      {/* Header */}
      <div className="w-full flex justify-between items-center gap-3">
        {/* Logout button */}
        <form
          action={async () => {
            const { logout } = await import("../actions/auth");
            await logout();
          }}
        >
          <button className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>

        {/* Right side: Dropdown, DarkMode, New Product */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
              aria-expanded={isDropdownOpen}
              whileTap={{ scale: 0.95 }}
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Manage</span>
              <motion.span
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="inline-flex"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 origin-top-right"
                >
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/prompts"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <FileText className="w-4 h-4" />
                      Manage Prompts
                    </Link>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/categories"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Layers className="w-4 h-4" />
                      Manage Categories
                    </Link>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DarkModeToggle />

          <Link
            href="/create"
            className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Product</span>
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-4">
        <SearchBar />
        <RecentProducts
          initialProducts={initialProducts}
          categories={categories}
        />
      </div>
    </div>
  );
}
