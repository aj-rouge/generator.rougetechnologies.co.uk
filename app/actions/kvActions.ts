// app/actions/kvActions.ts
"use server";

interface KVItem {
  key: string;
  value: any;
  metadata?: any;
}

export async function searchKVByPrefix(prefix: string): Promise<KVItem[]> {
  try {
    const kvNamespace = process.env.KV_NAMESPACE;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!kvNamespace || !accountId || !apiToken) {
      throw new Error("KV configuration missing");
    }

    // First, list keys with the prefix
    const listResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespace}/keys?prefix=${encodeURIComponent(
        prefix,
      )}&limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!listResponse.ok) {
      throw new Error(`Failed to list keys: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    const keys = listData.result || [];

    // Then, get values for all keys
    const items = await Promise.all(
      keys.map(async (keyObj: any) => {
        const valueResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespace}/values/${encodeURIComponent(
            keyObj.name,
          )}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          },
        );

        let value = null;
        if (valueResponse.ok) {
          try {
            value = await valueResponse.json();
          } catch {
            // If not JSON, get as text
            value = await valueResponse.text();
          }
        }

        return {
          key: keyObj.name,
          value,
          metadata: keyObj.metadata || null,
        };
      }),
    );

    // Sort by creation date (newest first)
    return items.sort((a, b) => {
      const dateA = a.value?.createdAt || a.value?.updatedAt || 0;
      const dateB = b.value?.createdAt || b.value?.updatedAt || 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  } catch (error) {
    console.error("Error searching KV:", error);
    throw error;
  }
}

export async function getRecentKVItems(limit: number = 10): Promise<KVItem[]> {
  try {
    // Get all keys first
    const allKeys = await listAllKVKeys();

    // Get values for the most recent keys
    const recentKeys = allKeys.slice(0, limit * 2); // Get extra to account for potential failures

    const items = await Promise.all(
      recentKeys.map(async (key) => {
        try {
          const kvNamespace = process.env.KV_NAMESPACE;
          const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
          const apiToken = process.env.CLOUDFLARE_API_TOKEN;

          const valueResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespace}/values/${encodeURIComponent(
              key,
            )}`,
            {
              headers: {
                Authorization: `Bearer ${apiToken}`,
              },
            },
          );

          if (!valueResponse.ok) return null;

          let value = null;
          try {
            value = await valueResponse.json();
          } catch {
            value = await valueResponse.text();
          }

          return {
            key,
            value,
          };
        } catch {
          return null;
        }
      }),
    );

    // Filter out null results and sort by date
    const validItems = items.filter(Boolean) as KVItem[];

    return validItems
      .sort((a, b) => {
        const dateA = a.value?.createdAt || a.value?.updatedAt || 0;
        const dateB = b.value?.createdAt || b.value?.updatedAt || 0;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting recent items:", error);
    return [];
  }
}

export async function listAllKVKeys(): Promise<string[]> {
  try {
    const kvNamespace = process.env.KV_NAMESPACE;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!kvNamespace || !accountId || !apiToken) {
      throw new Error("KV configuration missing");
    }

    let allKeys: string[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespace}/keys`,
      );

      url.searchParams.set("limit", "1000");
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list keys: ${response.statusText}`);
      }

      const data = await response.json();
      const keys = data.result || [];

      allKeys = allKeys.concat(keys.map((k: any) => k.name));
      cursor = data.result_info?.cursor;
    } while (cursor);

    return allKeys;
  } catch (error) {
    console.error("Error listing KV keys:", error);
    throw error;
  }
}
