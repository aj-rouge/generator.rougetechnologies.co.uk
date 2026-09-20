// Shared types for the audit layer. No imports — deliberately decoupled from auth.

export type MutationAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "import"
  | "publish"
  | "ai_generate"
  | "login"
  | (string & {}); // allow custom actions without losing autocomplete on the above

export type Diff = {
  field: string;
  old: unknown;
  new: unknown;
};

// Structurally compatible with the app's `User` type — pass it directly.
export type Actor = {
  id: string;
  name: string;
  email: string;
};

export type ParentRef = {
  type: string; // e.g. 'product'
  id: string; // e.g. product id
  label?: string | null;
};

export type AuditContext = {
  action: MutationAction;
  entityType: string; // 'product', 'product_specification', ...
  entityId?: string | null;
  entityLabel?: string | null;
  parent?: ParentRef | null;
  /** Overrides the auto-generated summary. */
  summary?: string | null;
  /** Field-level diffs. Omit for creates/deletes. */
  changes?: Diff[] | null;
  /** Freeform: bulk_count, correlation_id, model, tokens, etc. */
  metadata?: Record<string, unknown> | null;
};
