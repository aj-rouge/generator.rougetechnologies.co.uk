// utils/d1/execute.ts
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Helper to determine if we're in development mode
const isDev = () => process.env.NODE_ENV === "development";

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
    if (isDev()) {
      console.log(`[resolveDB] Using provided DB instance`);
    }
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
  if (isDev()) {
    console.log(`[executeQuery] SQL: ${sql}`);
    console.log(`[executeQuery] Params:`, params);
  }

  try {
    const dbInstance = await resolveDB(db);
    if (isDev()) {
      console.log(
        "[executeQuery] DB instance obtained, preparing statement...",
      );
    }
    const stmt = dbInstance.prepare(sql).bind(...params);
    if (isDev()) {
      console.log("[executeQuery] Statement prepared and bound.");
    }

    const trimmedSql = sql.trim().toUpperCase();
    if (trimmedSql.startsWith("SELECT")) {
      if (isDev()) {
        console.log("[executeQuery] Executing SELECT via stmt.all()...");
      }

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

      if (isDev()) {
        console.log(
          "[executeQuery] stmt.all() returned, response keys:",
          Object.keys(response || {}),
        );
        console.log(
          "[executeQuery] Full response (first 200 chars):",
          JSON.stringify(response).slice(0, 200),
        );
        console.log(
          `[executeQuery] SELECT returned ${response?.results?.length || 0} rows`,
        );
      }

      const results = response?.results || [];
      return results;
    }

    // Mutation (INSERT, UPDATE, DELETE, PRAGMA)
    if (isDev()) {
      console.log("[executeQuery] Executing mutation via stmt.run()...");
    }
    const response = await stmt.run();
    const meta = response.meta as any;
    if (isDev()) {
      console.log(
        `[executeQuery] Mutation succeeded, changes: ${meta?.changes || 0}`,
      );
      // --- ADD PERFORMANCE LOGGING ---
      console.log(`[executeQuery] 📊 Statement stats:
        - rows_read: ${meta?.rows_read || 0}
        - rows_written: ${meta?.rows_written || 0}
        - duration: ${meta?.duration || 0}ms
      `);
    }
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
  if (isDev()) {
    console.log(`[executeBatch] Running ${queries.length} queries in batch`);
  }

  try {
    const dbInstance = await resolveDB(db);
    if (isDev()) {
      console.log("[executeBatch] DB instance obtained, preparing batch...");
    }

    // Prepare all statements
    const statements = queries.map(({ sql, params }) =>
      dbInstance.prepare(sql).bind(...params),
    );

    if (isDev()) {
      console.log("[executeBatch] Executing batch via db.batch()...");
    }
    const results = await dbInstance.batch(statements);

    if (isDev()) {
      console.log(`[executeBatch] Batch executed, ${results.length} results`);

      // --- AGGREGATE PERFORMANCE STATS FOR THE ENTIRE BATCH ---
      let totalRowsRead = 0;
      let totalRowsWritten = 0;
      let totalDuration = 0;
      for (const result of results) {
        if (result.meta) {
          totalRowsRead += result.meta.rows_read || 0;
          totalRowsWritten += result.meta.rows_written || 0;
          totalDuration += result.meta.duration || 0;
        }
      }
      console.log(`[executeBatch] 📊 BATCH STATS:
        - total rows_read: ${totalRowsRead}
        - total rows_written: ${totalRowsWritten}
        - total duration: ${totalDuration}ms
      `);
      results.forEach((r, i) => {
        console.log(
          `  Stmt ${i + 1}: rows_read=${r.meta?.rows_read || 0}, rows_written=${r.meta?.rows_written || 0}`,
        );
      });
    }
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
