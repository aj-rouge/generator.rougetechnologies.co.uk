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
  ShieldCheck,
  BarChart3,
  History,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { DarkModeToggle } from "./header/DarkModeToggle";
import RecentProducts from "./recent/RecentProducts";
import SearchBar from "./search/SearchBar";
import { logout } from "../utils/auth/actions";
import type { User } from "../utils/auth";

interface ProductsDashboardClientProps {
  user: User;
  initialProducts: any[];
  categories: any[];
  initialCountFilters: any;
}

export default function ProductsDashboardClient({
  user,
  initialProducts,
  categories,
  initialCountFilters,
}: ProductsDashboardClientProps) {
  const showAdmin = user.role === "admin" || user.role === "dev";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const itemClass =
    "flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm";

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen">
      {/* Header */}
      <div className="w-full flex justify-between items-center gap-3">
        {/* Logout button */}
        <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
          {user.name} ({user.role})
        </span>
        <form action={logout}>
          <button className="flex items-center gap-2 p-3 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>

        {/* Right side */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Dropdown */}
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
                      className={itemClass}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <FileText className="w-4 h-4" />
                      Manage Prompts
                    </Link>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Link
                      href="/categories"
                      className={itemClass}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Layers className="w-4 h-4" />
                      Manage Categories
                    </Link>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Link
                      href="/dashboard"
                      className={itemClass}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Manage AI Usage
                    </Link>
                  </motion.div>

                  {showAdmin && (
                    <>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

                      <motion.div variants={itemVariants}>
                        <Link
                          href="/admin/analytics"
                          className={itemClass}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Analytics
                        </Link>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Link
                          href="/admin/activity"
                          className={itemClass}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <History className="w-4 h-4" />
                          Activity
                        </Link>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Link
                          href="/admin/users"
                          className={itemClass}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Admin
                        </Link>
                      </motion.div>
                    </>
                  )}
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
