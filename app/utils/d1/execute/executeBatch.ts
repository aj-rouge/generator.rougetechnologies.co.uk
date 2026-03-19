// executeBatch.ts
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

export const executeBatch = async (
  queries: Array<{ sql: string; params: any[] }>,
): Promise<any[]> => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/batch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        queries.map((q) => ({
          sql: q.sql,
          params: q.params.map((p) => String(p)),
        })),
      ),
    },
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error(`D1 batch error: ${JSON.stringify(data.errors)}`);
  }
  return data.result;
};
