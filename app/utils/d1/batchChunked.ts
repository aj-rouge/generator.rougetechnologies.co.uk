// utils/d1/batchChunked.ts
import type { D1Database } from "@cloudflare/workers-types";
import { executeBatch } from "./execute";

export type D1Statement = { sql: string; params: any[] };

export interface ChunkedBatchOptions {
  /** Max statements per D1 batch() call. Default 200 — well under D1's ~1000 cap. */
  maxStatementsPerChunk?: number;
  /** Rough max bytes of SQL + params per chunk. Default 500 KB. */
  maxBytesPerChunk?: number;
  /**
   * Atomic grouping. Chunk boundaries never split a group of N consecutive
   * statements. Use this when statement ordering must be preserved
   * (e.g. delete + audit pairs must stay together).
   * Default 1 (no grouping).
   */
  groupSize?: number;
  /** Fired after each successful chunk. Useful for logging / progress. */
  onChunkComplete?: (info: {
    chunkIndex: number;
    chunkSize: number;
    totalProcessed: number;
    totalStatements: number;
  }) => void;
}

export interface ChunkedBatchResult {
  totalStatements: number;
  totalChunks: number;
  /** Number of statements that successfully executed before any failure. */
  succeeded: number;
  failedChunkIndex: number | null;
  failedChunkError?: string;
  resultsByChunk: any[][];
}

/**
 * Chunked wrapper around executeBatch. Splits a large statement array into
 * D1-safe batches, respecting both statement-count and byte-size limits.
 *
 * - Each chunk is atomic (D1 batch semantics). If chunk K fails, chunks
 *   0..K-1 are committed, chunk K is rolled back, chunks K+1..N never run.
 * - When `groupSize > 1`, chunks always split on group boundaries — a
 *   partial failure never separates a group.
 * - Idempotent for the caller: delete endpoints just want to know how
 *   much succeeded.
 */
export async function executeBatchChunked(
  statements: D1Statement[],
  db: D1Database,
  opts: ChunkedBatchOptions = {},
): Promise<ChunkedBatchResult> {
  const maxStmts = opts.maxStatementsPerChunk ?? 200;
  const maxBytes = opts.maxBytesPerChunk ?? 500_000;
  const groupSize = Math.max(1, opts.groupSize ?? 1);

  if (statements.length === 0) {
    return {
      totalStatements: 0,
      totalChunks: 0,
      succeeded: 0,
      failedChunkIndex: null,
      resultsByChunk: [],
    };
  }

  const chunks = chunkStatements(statements, maxStmts, maxBytes, groupSize);
  const resultsByChunk: any[][] = [];
  let totalProcessed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const results = await executeBatch(chunk, db);
      resultsByChunk.push(results);
      totalProcessed += chunk.length;
      opts.onChunkComplete?.({
        chunkIndex: i,
        chunkSize: chunk.length,
        totalProcessed,
        totalStatements: statements.length,
      });
    } catch (err: any) {
      return {
        totalStatements: statements.length,
        totalChunks: chunks.length,
        succeeded: totalProcessed,
        failedChunkIndex: i,
        failedChunkError: err?.message ?? String(err),
        resultsByChunk,
      };
    }
  }

  return {
    totalStatements: statements.length,
    totalChunks: chunks.length,
    succeeded: totalProcessed,
    failedChunkIndex: null,
    resultsByChunk,
  };
}

/**
 * Split into D1-safe chunks. Respects group boundaries when `groupSize > 1`.
 */
function chunkStatements(
  statements: D1Statement[],
  maxStmts: number,
  maxBytes: number,
  groupSize: number,
): D1Statement[][] {
  const chunks: D1Statement[][] = [];
  let current: D1Statement[] = [];
  let currentBytes = 0;

  for (let i = 0; i < statements.length; i += groupSize) {
    const group = statements.slice(i, i + groupSize);
    const groupBytes = group.reduce(
      (sum, s) => sum + estimateStatementBytes(s),
      0,
    );

    const wouldExceedStmts = current.length + group.length > maxStmts;
    const wouldExceedBytes = currentBytes + groupBytes > maxBytes;

    if (current.length > 0 && (wouldExceedStmts || wouldExceedBytes)) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push(...group);
    currentBytes += groupBytes;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** Cheap upper-bound estimate of one statement's contribution to payload size. */
function estimateStatementBytes(stmt: D1Statement): number {
  let bytes = stmt.sql.length;
  for (const p of stmt.params) {
    if (p === null || p === undefined) bytes += 4;
    else if (typeof p === "number") bytes += 8;
    else if (typeof p === "boolean") bytes += 5;
    else if (typeof p === "string") bytes += p.length + 4;
    else bytes += JSON.stringify(p).length + 4;
  }
  return bytes;
}
