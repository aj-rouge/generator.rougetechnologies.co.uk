import { executeQuery } from "./client";

export const selectAll = async (table: string): Promise<any[]> => {
  return await executeQuery(`SELECT * FROM ${table}`);
};

export const selectWhere = async (
  table: string,
  conditions: Record<string, any>,
): Promise<any[]> => {
  const whereClauses = Object.keys(conditions)
    .map((key) => `${key} = ?`)
    .join(" AND ");
  const values = Object.values(conditions);
  const sql = `SELECT * FROM ${table} WHERE ${whereClauses}`;
  return await executeQuery(sql, values);
};

export const insertRow = async (
  table: string,
  data: Record<string, any>,
): Promise<{ success: boolean; changes: number }> => {
  const columns = Object.keys(data).join(", ");
  const placeholders = Object.keys(data)
    .map(() => "?")
    .join(", ");
  const values = Object.values(data);
  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
  const result = await executeQuery(sql, values);
  return { success: true, changes: result.changes || 0 };
};

export const updateRow = async (
  table: string,
  data: Record<string, any>,
  conditions: Record<string, any>,
): Promise<{ success: boolean; changes: number }> => {
  const setClause = Object.keys(data)
    .map((key) => `${key} = ?`)
    .join(", ");
  const whereClause = Object.keys(conditions)
    .map((key) => `${key} = ?`)
    .join(" AND ");
  const values = [...Object.values(data), ...Object.values(conditions)];
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const result = await executeQuery(sql, values);
  return { success: true, changes: result.changes || 0 };
};

export const deleteRow = async (
  table: string,
  conditions: Record<string, any>,
): Promise<{ success: boolean; changes: number }> => {
  const whereClause = Object.keys(conditions)
    .map((key) => `${key} = ?`)
    .join(" AND ");
  const values = Object.values(conditions);
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  const result = await executeQuery(sql, values);
  return { success: true, changes: result.changes || 0 };
};
