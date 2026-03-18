"use server";

/**
 * Fetches data from Cloudflare KV with robust error handling
 * and support for both JSON and plain-text values.
 */
export async function getKVData(key: string): Promise<any> {
  const kvNamespace = process.env.KV_NAMESPACE;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!kvNamespace || !accountId || !apiToken) {
    console.error(
      "❌ KV Configuration Missing: Check your environment variables.",
    );
    return null;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespace}/values/${encodeURIComponent(
        key,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        // Optional: Next.js caching config
        next: { revalidate: 0 },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ Key not found: ${key}`);
        return null;
      }
      const errorDetail = await response.text();
      console.error(
        `❌ Cloudflare API Error (${response.status}):`,
        errorDetail,
      );
      return null;
    }

    // Robust Parsing: Attempt JSON, fallback to Text
    const contentType = response.headers.get("content-type");
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return text; // Return as raw string if not valid JSON
    }
  } catch (error) {
    console.error(
      `❌ Network or System Error fetching KV key "${key}":`,
      error,
    );
    return null;
  }
}
