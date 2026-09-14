"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "./password";
import { createSession, deleteSession } from "./session";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTS,
  getDb,
  getRequestMeta,
} from "./index";

export type LoginState = { error: string } | null;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<{ error: string }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/");

  if (!email || !password) return { error: "Invalid email or password" };

  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT id, password_hash, role, must_reset_pw, is_active
         FROM users WHERE email = ?`,
    )
    .bind(email)
    .first<{
      id: string;
      password_hash: string;
      role: string;
      must_reset_pw: number;
      is_active: number;
    }>();

  if (!row || row.is_active !== 1) {
    // Dummy verify to keep timing constant
    await verifyPassword(
      password,
      "pbkdf2$sha256$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    );
    return { error: "Invalid email or password" };
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return { error: "Invalid email or password" };

  const { ip, userAgent } = await getRequestMeta();
  const sid = await createSession(db, row.id, ip, userAgent);

  await db
    .prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`)
    .bind(Date.now(), row.id)
    .run();

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sid, SESSION_COOKIE_OPTS);

  if (row.must_reset_pw === 1) redirect("/account/reset-password");

  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  redirect(safeNext);
}

export async function logout(_formData?: FormData): Promise<void> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (sid) {
    const db = await getDb();
    await deleteSession(db, sid);
  }
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export type ResetState = { error?: string };
export async function resetOwnPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const { getCurrentUser } = await import("./index");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 12)
    return { error: "Password must be at least 12 characters" };
  if (next !== confirm) return { error: "Passwords do not match" };

  const db = await getDb();
  const row = await db
    .prepare(`SELECT password_hash FROM users WHERE id = ?`)
    .bind(user.id)
    .first<{ password_hash: string }>();
  if (!row) redirect("/login");

  const ok = await verifyPassword(current, row.password_hash);
  if (!ok) return { error: "Current password is incorrect" };

  const hash = await hashPassword(next);
  await db
    .prepare(
      `UPDATE users SET password_hash = ?, must_reset_pw = 0, updated_at = ? WHERE id = ?`,
    )
    .bind(hash, Date.now(), user.id)
    .run();

  redirect("/");
}
