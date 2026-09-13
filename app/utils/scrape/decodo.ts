// app/utils/scrape/decodo.ts
//
// Core Decodo API client. All marketplace helpers go through decodoRequest.

const DECODO_API = "https://scraper-api.decodo.com/v2/scrape";
const AUTH_HEADER =
  "Basic VTAwMDAzMzY1MDA6UFdfMTU1OWEwN2I4N2NiMjU4YTk1MjhlYWY4NDc2MTMwYzU2";

export interface DecodoOptions {
  url?: string;
  target?: string;
  query?: string;
  domain?: string;
  page_from?: string;
  render?: "html" | "image";
  parse?: boolean;
  [key: string]: any;
}

/**
 * Core API request — all marketplace helpers use this.
 */
export async function decodoRequest(options: DecodoOptions): Promise<any> {
  const payload = { ...options };

  // Default parse to true for Amazon targets
  if (
    payload.parse === undefined &&
    (payload.target === "amazon_search" || payload.target === "amazon_product")
  ) {
    payload.parse = true;
  }

  const response = await fetch(DECODO_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: AUTH_HEADER,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Decodo API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Fetch raw HTML from any URL (used by eBay and Currys).
 * NOTE: For business.currys.co.uk this returns complete HTML — no JS
 * rendering needed. All product data lives in inline <script> tags.
 */
export async function fetchRawHtml(url: string): Promise<string> {
  const result = await decodoRequest({
    url,
    target: "universal",
    render: "html",
    proxy_pool: "standard",
    headless: "html",
  });
  const html = result?.results?.[0]?.content;
  if (!html) throw new Error("No HTML content returned from Decodo");
  return html;
}
