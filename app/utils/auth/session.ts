const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_BELOW = 25 * 24 * 60 * 60 * 1000;

export type SessionRow = {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
};

export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let hex = "";
  for (let i = 0; i < bytes.length; i++)
    hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

export async function createSession(
  db: D1Database,
  userId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<string> {
  const id = generateSessionId();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at, created_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, now + SESSION_TTL_MS, now, ip, userAgent)
    .run();
  return id;
}

export async function getSession(
  db: D1Database,
  id: string,
): Promise<SessionRow | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, expires_at, created_at FROM sessions WHERE id = ?`,
    )
    .bind(id)
    .first<SessionRow>();

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(id).run();
    return null;
  }

  if (row.expires_at - Date.now() < REFRESH_BELOW) {
    const newExp = Date.now() + SESSION_TTL_MS;
    await db
      .prepare(`UPDATE sessions SET expires_at = ? WHERE id = ?`)
      .bind(newExp, id)
      .run();
    row.expires_at = newExp;
  }

  return row;
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(id).run();
}

export async function deleteUserSessions(
  db: D1Database,
  userId: string,
): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
}
