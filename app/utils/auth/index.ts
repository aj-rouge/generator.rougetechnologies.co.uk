import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSession } from "./session";

export const SESSION_COOKIE = "session";
export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
} as const;

export type Role = "admin" | "dev" | "employee";

export function isStaff(role: Role): boolean {
  return role === "admin" || role === "dev";
}

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB?: D1Database }).DB;
  if (!db) throw new Error("D1 binding 'DB' not found");
  return db;
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const db = await getDb();
  const session = await getSession(db, sid);
  if (!session) return null;

  const user = await db
    .prepare(
      `SELECT id, name, email, role
         FROM users
        WHERE id = ? AND is_active = 1 AND deleted_at IS NULL`,
    )
    .bind(session.user_id)
    .first<User>();

  return user ?? null;
}

export async function requireSession(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login",
    );
  }
  return user;
}
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function requireStaff(nextPath?: string): Promise<User> {
  const user = await requireSession(nextPath);
  if (!isStaff(user.role)) redirect("/");
  return user;
}

export async function getRequestMeta(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  return { ip: h.get("cf-connecting-ip"), userAgent: h.get("user-agent") };
}
