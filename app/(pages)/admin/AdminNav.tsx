"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default function AdminNav() {
  const pathname = usePathname();

  // Match the most specific route so /admin/users/123 still activates "Users".
  const activeHref = NAV_ITEMS.reduce<string | null>((best, item) => {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.length) return item.href;
    }
    return best;
  }, null);

  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV_ITEMS.map((item) => {
        const isActive = activeHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative px-3 py-1.5 rounded-md transition-colors ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <span className="relative z-10">{item.label}</span>

            {isActive && (
              <motion.span
                layoutId="admin-nav-active"
                className="absolute inset-0 bg-blue-50 dark:bg-blue-950/40 rounded-md"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
