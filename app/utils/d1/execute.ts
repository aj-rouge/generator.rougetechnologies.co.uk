// utils/d1/execute.ts
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Define the shape of D1's response from stmt.all()
interface D1AllResponse {
  results: any[];
  success: boolean;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

/**
 * Resolve the D1 database instance.
 * - If a `db` instance is provided, use it.
 * - Otherwise, fetch it from the Cloudflare context.
 */
async function resolveDB(db?: D1Database): Promise<D1Database> {
  if (db) {
    console.log(`[resolveDB] Using provided DB instance`);
    if (typeof db.prepare !== "function") {
      console.error("[resolveDB] Provided DB does not have a prepare method!");
    }
    return db;
  }
  const { env } = await getCloudflareContext({ async: true });
  const contextDb = (env as any).DB;
  if (!contextDb) {
    throw new Error(
      "D1 Binding 'DB' is missing. Pass it explicitly or ensure the function is called within a Cloudflare context using getCloudflareContext().",
    );
  }
  return contextDb;
}

/**
 * Execute a single SQL query (SELECT or mutation) against the D1 database.
 * @param sql - SQL query string
 * @param params - Query parameters
 * @param db - Optional D1Database instance (if not provided, will be fetched from context)
 */
export const executeQuery = async (
  sql: string,
  params: any[] = [],
  db: D1Database,
): Promise<any> => {
  console.log(`[executeQuery] SQL: ${sql}`);
  console.log(`[executeQuery] Params:`, params);

  try {
    const dbInstance = await resolveDB(db);
    console.log("[executeQuery] DB instance obtained, preparing statement...");
    const stmt = dbInstance.prepare(sql).bind(...params);
    console.log("[executeQuery] Statement prepared and bound.");

    const trimmedSql = sql.trim().toUpperCase();
    if (trimmedSql.startsWith("SELECT")) {
      console.log("[executeQuery] Executing SELECT via stmt.all()...");

      // Add timeout to detect hanging queries
      const timeout = 10000; // 10 seconds
      const resultPromise = stmt.all();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("stmt.all() timed out after 10s")),
          timeout,
        ),
      );

      // Cast the result to D1AllResponse
      const response = (await Promise.race([
        resultPromise,
        timeoutPromise,
      ])) as D1AllResponse;

      console.log(
        "[executeQuery] stmt.all() returned, response keys:",
        Object.keys(response || {}),
      );
      console.log(
        "[executeQuery] Full response (first 200 chars):",
        JSON.stringify(response).slice(0, 200),
      );

      const results = response?.results || [];
      console.log(`[executeQuery] SELECT returned ${results.length} rows`);
      return results;
    }

    console.log("[executeQuery] Executing mutation via stmt.run()...");
    const response = await stmt.run();
    const meta = response.meta as any;
    console.log(
      `[executeQuery] Mutation succeeded, changes: ${meta?.changes || 0}`,
    );
    return {
      success: response.success,
      changes: meta?.changes || 0,
      results: response.results || [],
      lastRowId: meta?.last_row_id,
    };
  } catch (error) {
    console.error(`[executeQuery] ❌ D1 execution error:`);
    console.error(error);
    console.error(
      `[executeQuery] Stack trace:`,
      error instanceof Error ? error.stack : "No stack",
    );
    console.error(`[executeQuery] Stringified error:`, String(error));
    throw error;
  }
};

/**
 * Execute multiple queries as a batch transaction.
 * @param queries - Array of { sql, params } objects
 * @param db - Optional D1Database instance (if not provided, will be fetched from context)
 */
export const executeBatch = async (
  queries: Array<{ sql: string; params: any[] }>,
  db?: D1Database,
): Promise<any[]> => {
  console.log(`[executeBatch] Running ${queries.length} queries in batch`);

  try {
    const dbInstance = await resolveDB(db);
    console.log("[executeBatch] DB instance obtained, preparing batch...");

    // Prepare all statements
    const statements = queries.map(({ sql, params }) =>
      dbInstance.prepare(sql).bind(...params),
    );

    console.log("[executeBatch] Executing batch via db.batch()...");
    const results = await dbInstance.batch(statements);

    console.log(`[executeBatch] Batch executed, ${results.length} results`);
    return results;
  } catch (error) {
    console.error(`[executeBatch] ❌ Batch execution error:`);
    console.error(error);
    console.error(
      `[executeBatch] Stack trace:`,
      error instanceof Error ? error.stack : "No stack",
    );
    throw error;
  }
};
