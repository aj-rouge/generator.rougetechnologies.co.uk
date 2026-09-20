import Link from "next/link";
import { requireStaff } from "../../utils/auth";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff("/admin/users");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto flex items-center gap-6 px-6 py-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Dashboard
          </Link>
          <AdminNav />
          <div className="ml-auto text-xs text-gray-400">
            {user.name} ({user.role})
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
