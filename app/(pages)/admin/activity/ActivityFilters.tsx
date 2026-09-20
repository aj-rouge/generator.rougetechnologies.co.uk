"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import FilterSelect from "./FilterSelect";

const ACTIONS = ["create", "update", "delete", "restore", "import", "publish"];
const ENTITY_TYPES = ["product"];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};

const resetVariants: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function ActivityFilters({
  users,
  currentUserId,
  currentAction,
  currentEntityType,
  currentFrom,
  currentTo,
}: {
  users: { user_id: string; user_name: string }[];
  currentUserId?: string;
  currentAction?: string;
  currentEntityType?: string;
  currentFrom?: string;
  currentTo?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.push(`/admin/activity?${next.toString()}`);
  };

  const hasFilters = Boolean(
    currentUserId ||
    currentAction ||
    currentEntityType ||
    currentFrom ||
    currentTo,
  );

  const dateInput =
    "px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:border-gray-400 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap items-center gap-2"
    >
      <motion.div variants={itemVariants}>
        <FilterSelect
          value={currentUserId ?? ""}
          onChange={(v) => setParam("userId", v)}
          placeholder="All users"
          options={users.map((u) => ({
            value: u.user_id,
            label: u.user_name,
          }))}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <FilterSelect
          value={currentAction ?? ""}
          onChange={(v) => setParam("action", v)}
          placeholder="All actions"
          options={ACTIONS.map((a) => ({ value: a, label: a }))}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <FilterSelect
          value={currentEntityType ?? ""}
          onChange={(v) => setParam("entityType", v)}
          placeholder="All entities"
          options={ENTITY_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <input
          type="date"
          value={currentFrom ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
          className={dateInput}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <input
          type="date"
          value={currentTo ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
          className={dateInput}
        />
      </motion.div>

      <motion.button
        variants={resetVariants}
        onClick={() => router.push("/admin/activity")}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        disabled={!hasFilters}
        className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white hover:underline ml-auto disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline disabled:hover:text-gray-500"
      >
        Reset
      </motion.button>
    </motion.div>
  );
}
