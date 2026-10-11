import Link from "next/link";
import { Home } from "lucide-react";
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
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
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
