"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { EmployeeSummary } from "../../../utils/d1/analytics";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function EmployeeCard({
  summary,
}: {
  summary: EmployeeSummary;
}) {
  const initials = summary.user_name
    .split(/[\s._-]+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 transition-colors hover:border-gray-300 dark:hover:border-gray-700"
    >
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 24,
            delay: 0.05,
          }}
          className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-sm font-medium"
        >
          {initials}
        </motion.div>
        <div className="min-w-0">
          <div className="font-medium truncate">{summary.user_name}</div>
          <div className="text-xs text-gray-500 truncate">
            {summary.user_email}
          </div>
        </div>
        <Link
          href={`/admin/activity?userId=${summary.user_id}`}
          className="group ml-auto inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          View feed
          <motion.span
            className="inline-flex"
            initial={false}
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.span>
        </Link>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
      >
        <Stat label="Created" value={summary.products_created} />
        <Stat label="Edited" value={summary.products_edited} />
        <Stat label="Products" value={summary.distinct_products} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-3 text-xs text-gray-500"
      >
        Last action {new Date(summary.last_action_at).toLocaleString()}
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <motion.div variants={item}>
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </motion.div>
  );
}
