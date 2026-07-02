import type { D1Database } from "@cloudflare/workers-types";
import { executeQuery } from "../d1/execute";

/**
 * Simple template engine: replaces {{key}} with value from data.
 * No conditionals or loops – all formatting must be done in the handler.
 */
export function compilePrompt(
  template: string,
  data: Record<string, any>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

/**
 * Fetch a prompt template from the database for a given task.
 * Throws an error if the template is not found – no fallback.
 */
export async function getPromptTemplate(
  task: string,
  db: D1Database,
): Promise<string> {
  const rows = await executeQuery(
    "SELECT template_text FROM prompt_templates WHERE task = ?",
    [task],
    db,
  );
  if (!rows || rows.length === 0) {
    throw new Error(`Prompt template for task "${task}" not found in database`);
  }
  return rows[0].template_text;
}
