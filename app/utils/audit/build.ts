import type { Actor, AuditContext, Diff } from "./types";

const MAX_VALUE_LENGTH = 2000;

const ALWAYS_IGNORED = new Set([
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
]);

const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/i;

export function assertSafeIdent(name: string, kind: string): void {
  if (!SAFE_IDENT.test(name)) {
    throw new Error(`Unsafe ${kind} identifier: ${JSON.stringify(name)}`);
  }
}

// ----------------------------------------------------------------
// diff
// ----------------------------------------------------------------
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: T,
  ignore: readonly string[] = [],
): Diff[] {
  const skip = new Set<string>([...ALWAYS_IGNORED, ...ignore]);
  const keys = new Set<string>([
    ...Object.keys(before as object),
    ...Object.keys(after as object),
  ]);
  const out: Diff[] = [];

  for (const field of keys) {
    if (skip.has(field)) continue;
    const a = (before as Record<string, unknown>)[field] ?? null;
    const b = (after as Record<string, unknown>)[field] ?? null;
    if (valuesEqual(a, b)) continue;
    out.push({ field, old: clip(a), new: clip(b) });
  }
  return out;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") return JSON.stringify(a) === JSON.stringify(b);
  return false;
}

function clip(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s.length <= MAX_VALUE_LENGTH) return v;
  return s.slice(0, MAX_VALUE_LENGTH) + "…";
}

// ----------------------------------------------------------------
// summary
// ----------------------------------------------------------------
export function buildSummary(
  action: string,
  entityType: string,
  entityLabel: string | null | undefined,
  changes: Diff[] | null | undefined,
): string {
  const label = entityLabel ? ` "${entityLabel}"` : "";
  switch (action) {
    case "create":
      return `Created ${entityType}${label}`;
    case "delete":
      return `Deleted ${entityType}${label}`;
    case "update": {
      if (!changes || changes.length === 0) {
        return `Updated ${entityType}${label}`;
      }
      if (changes.length === 1) {
        return `Changed ${changes[0].field} on ${entityType}${label}`;
      }
      if (changes.length <= 4) {
        return `Updated ${entityType}${label} (${changes
          .map((c) => c.field)
          .join(", ")})`;
      }
      return `Updated ${entityType}${label} (${changes.length} fields)`;
    }
    default:
      return `${action} ${entityType}${label}`;
  }
}

// ----------------------------------------------------------------
// statement parts — for use in executeBatch queues ({ sql, params })
// ----------------------------------------------------------------
export function buildAuditStatementParts(
  actor: Actor,
  ctx: AuditContext,
): { sql: string; params: any[] } {
  const now = Date.now();
  const parent = ctx.parent ?? null;

  const summary =
    ctx.summary ??
    buildSummary(
      ctx.action,
      ctx.entityType,
      ctx.entityLabel ?? null,
      ctx.changes ?? null,
    );

  const hasChanges = !!ctx.changes && ctx.changes.length > 0;
  const hasMetadata = !!ctx.metadata && Object.keys(ctx.metadata).length > 0;

  return {
    sql: `INSERT INTO activity_log (
            id, user_id, user_name, user_email,
            action, entity_type, entity_id, entity_label,
            parent_type, parent_id, parent_label,
            summary, changes, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      crypto.randomUUID(),
      actor.id,
      actor.name,
      actor.email,
      ctx.action,
      ctx.entityType,
      ctx.entityId ?? null,
      ctx.entityLabel ?? null,
      parent?.type ?? null,
      parent?.id ?? null,
      parent?.label ?? null,
      summary,
      hasChanges ? JSON.stringify(ctx.changes) : null,
      hasMetadata ? JSON.stringify(ctx.metadata) : null,
      now,
    ],
  };
}

// ----------------------------------------------------------------
// statement — for direct db.batch / db.prepare usage
// ----------------------------------------------------------------
export function buildAuditStatement(
  db: D1Database,
  actor: Actor,
  ctx: AuditContext,
): D1PreparedStatement {
  const { sql, params } = buildAuditStatementParts(actor, ctx);
  return db.prepare(sql).bind(...params);
}

// ----------------------------------------------------------------
// read-side parsers
// ----------------------------------------------------------------
export function parseChanges(raw: string | null): Diff[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Diff[]) : [];
  } catch {
    return [];
  }
}

export function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
