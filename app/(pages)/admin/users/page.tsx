import UsersTable from "./UsersTable";
import CreateUserForm from "./CreateUserForm";
import { getDb, requireStaff } from "../../../utils/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "dev" | "employee";
  is_active: number;
  must_reset_pw: number;
  last_login_at: number | null;
  created_at: number;
  deleted_at: number | null;
};

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function UsersPage(props: PageProps) {
  await requireStaff("/admin/users");
  const searchParams = await props.searchParams;
  const currentFilter = searchParams.status ?? "all";

  const db = await getDb();

  // Dynamic status SQL clause
  let statusClause = "WHERE deleted_at IS NULL";
  if (currentFilter === "active") {
    statusClause = "WHERE deleted_at IS NULL AND is_active = 1";
  } else if (currentFilter === "disabled") {
    statusClause = "WHERE deleted_at IS NULL AND is_active = 0";
  } else if (currentFilter === "deleted") {
    statusClause = "WHERE deleted_at IS NOT NULL";
  } else if (currentFilter === "all_with_deleted") {
    statusClause = "";
  }

  const { results } = await db
    .prepare(
      `SELECT id, name, email, role, is_active, must_reset_pw, last_login_at, created_at, deleted_at
         FROM users
        ${statusClause}
        ORDER BY
          CASE role WHEN 'admin' THEN 0 WHEN 'dev' THEN 1 ELSE 2 END,
          name ASC`,
    )
    .all<UserRow>();

  const { results: sessionCounts } = await db
    .prepare(
      `SELECT user_id, COUNT(*) AS n
         FROM sessions
        WHERE expires_at > ?
        GROUP BY user_id`,
    )
    .bind(Date.now())
    .all<{ user_id: string; n: number }>();

  const filterTabs = [
    { label: "Active & Disabled", value: "all" },
    { label: "Active", value: "active" },
    { label: "Disabled", value: "disabled" },
    { label: "Deleted", value: "deleted" },
    { label: "All (Incl. Deleted)", value: "all_with_deleted" },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage who can access the tool.
        </p>
      </div>

      <CreateUserForm />

      <div className="space-y-4">
        {/* Status Filter Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 text-sm">
          {filterTabs.map((tab) => {
            const isActive = currentFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={
                  tab.value === "all"
                    ? "/admin/users"
                    : `/admin/users?status=${tab.value}`
                }
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  isActive
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <UsersTable
          users={results}
          currentUserId={(await requireStaff()).id}
          sessionCounts={Object.fromEntries(
            sessionCounts.map((r) => [r.user_id, r.n]),
          )}
        />
      </div>
    </div>
  );
}
