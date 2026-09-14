"use server";

import { revalidatePath } from "next/cache";
import { getDb, requireStaff } from "../../utils/auth";
import { hashPassword } from "../../utils/auth/password";
import { deleteUserSessions } from "../../utils/auth/session";

export type ActionState = {
  ok?: boolean;
  error?: string;
  tempPassword?: string;
} | null;

// ----------------------------------------------------------------
// Create user
// ----------------------------------------------------------------
export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff("/admin/users");

  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "employee");
  const temp = String(formData.get("temp") ?? "");

  if (!/^[a-z0-9._-]{2,32}$/.test(name)) {
    return {
      error: "Name must be 2–32 chars: lowercase letters, numbers, . _ -",
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email" };
  }
  if (temp.length < 12) return { error: "Temp password must be 12+ chars" };
  if (!["admin", "dev", "employee"].includes(role)) {
    return { error: "Invalid role" };
  }

  const db = await getDb();

  const existing = await db
    .prepare(
      `SELECT id FROM users WHERE (email = ? OR name = ?) AND deleted_at IS NULL`,
    )
    .bind(email, name)
    .first();
  if (existing) return { error: "Email or name already registered" };

  const now = Date.now();
  const hash = await hashPassword(temp);

  await db
    .prepare(
      `INSERT INTO users (id, email, name, role, password_hash,
                          is_active, must_reset_pw, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
    )
    .bind(crypto.randomUUID(), email, name, role, hash, now, now)
    .run();

  revalidatePath("/admin/users");
  return { ok: true };
}

// ----------------------------------------------------------------
// Update user (name, email, role)
// ----------------------------------------------------------------
export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireStaff("/admin/users");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "employee");

  if (!id) return { error: "Missing user id" };
  if (!/^[a-z0-9._-]{2,32}$/.test(name)) return { error: "Invalid name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email" };
  }
  if (!["admin", "dev", "employee"].includes(role)) {
    return { error: "Invalid role" };
  }
  if (id === me.id && role !== "admin") {
    return { error: "You cannot demote yourself" };
  }

  const db = await getDb();

  const target = await db
    .prepare(`SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`)
    .bind(id)
    .first();
  if (!target) return { error: "User not found" };

  const clash = await db
    .prepare(
      `SELECT id FROM users 
        WHERE (email = ? OR name = ?) AND id != ? AND deleted_at IS NULL`,
    )
    .bind(email, name, id)
    .first();
  if (clash) return { error: "Email or name already registered" };

  await db
    .prepare(
      `UPDATE users SET name = ?, email = ?, role = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(name, email, role, Date.now(), id)
    .run();

  revalidatePath("/admin/users");
  return { ok: true };
}

// ----------------------------------------------------------------
// Soft delete user — sets deleted_at, disables account & kills sessions
// ----------------------------------------------------------------
export async function deleteUser(formData: FormData): Promise<void> {
  const me = await requireStaff("/admin/users");
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return; // Never soft-delete yourself

  const db = await getDb();
  const now = Date.now();

  // Mangle email and name to avoid SQLite UNIQUE constraint issues if re-added
  await db
    .prepare(
      `UPDATE users 
          SET deleted_at = ?,
              is_active = 0,
              updated_at = ?,
              email = email || '__deleted_' || ?,
              name = name || '__deleted_' || ?
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(now, now, now, now, id)
    .run();

  await deleteUserSessions(db, id);

  revalidatePath("/admin/users");
}

// ----------------------------------------------------------------
// Toggle active — disabling also kills all sessions
// ----------------------------------------------------------------
export async function toggleUserActive(formData: FormData): Promise<void> {
  const me = await requireStaff("/admin/users");
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return; // never disable yourself

  const db = await getDb();
  const row = await db
    .prepare(`SELECT is_active FROM users WHERE id = ? AND deleted_at IS NULL`)
    .bind(id)
    .first<{ is_active: number }>();
  if (!row) return;

  const next = row.is_active ? 0 : 1;
  await db
    .prepare(
      `UPDATE users SET is_active = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(next, Date.now(), id)
    .run();

  if (next === 0) await deleteUserSessions(db, id);

  revalidatePath("/admin/users");
}

// ----------------------------------------------------------------
// Reset password — never self, returns temp password once
// ----------------------------------------------------------------
export async function resetUserPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireStaff("/admin/users");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user id" };
  if (id === me.id) {
    return {
      error: "Use /account/reset-password to change your own password.",
    };
  }

  const db = await getDb();
  const user = await db
    .prepare(`SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`)
    .bind(id)
    .first();
  if (!user) return { error: "User not found" };

  const temp = generateTempPassword();
  const hash = await hashPassword(temp);

  await db
    .prepare(
      `UPDATE users SET password_hash = ?, must_reset_pw = 1, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(hash, Date.now(), id)
    .run();

  await deleteUserSessions(db, id);

  revalidatePath("/admin/users");
  return { ok: true, tempPassword: temp };
}

function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ----------------------------------------------------------------
// Restore soft-deleted user
// ----------------------------------------------------------------
export async function restoreUser(formData: FormData): Promise<ActionState> {
  await requireStaff("/admin/users");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user id" };

  const db = await getDb();
  const user = await db
    .prepare(
      `SELECT name, email FROM users WHERE id = ? AND deleted_at IS NOT NULL`,
    )
    .bind(id)
    .first<{ name: string; email: string }>();

  if (!user) return { error: "User not found or not deleted" };

  const cleanName = user.name.replace(/__deleted_\d+$/, "");
  const cleanEmail = user.email.replace(/__deleted_\d+$/, "");

  // Ensure no active user already took the original name/email
  const clash = await db
    .prepare(
      `SELECT id FROM users WHERE (email = ? OR name = ?) AND deleted_at IS NULL`,
    )
    .bind(cleanEmail, cleanName)
    .first();

  if (clash) {
    return {
      error:
        "Cannot restore: email or name is currently used by an active user",
    };
  }

  const now = Date.now();
  await db
    .prepare(
      `UPDATE users 
          SET deleted_at = NULL, 
              is_active = 1, 
              name = ?, 
              email = ?, 
              updated_at = ? 
        WHERE id = ?`,
    )
    .bind(cleanName, cleanEmail, now, id)
    .run();

  revalidatePath("/admin/users");
  return { ok: true };
}
