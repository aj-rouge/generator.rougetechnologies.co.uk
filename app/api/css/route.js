import { NextResponse } from "next/server";
import styles from "../../../generated-css/styles.css.js";

// Your existing time‑computation logic (extract to a function)
function computeTimeText(now) {
  const cutoff = new Date(now);
  cutoff.setHours(10, 30, 0, 0);
  const day = now.getDay();
  const isWeekday = day >= 1 && day <= 5;
  const msLeft = cutoff.getTime() - now.getTime();
  const minutesLeft = msLeft > 0 ? Math.ceil(msLeft / 60000) : 0;

  if (isWeekday && msLeft > 0) {
    return minutesLeft >= 60
      ? `in the next ${Math.ceil(minutesLeft / 60)} hours `
      : `in the next ${minutesLeft} minutes `;
  }
  return " before 10:30am Mon - Fri ";
}

export async function GET() {
  const now = new Date();

  // 1. Build a cache key based on the current minute (UTC)
  const minuteKey = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  const cacheKey = `css:${minuteKey}`;

  // 2. Try to get from Cloudflare's cache
  const cache = caches.default;
  let cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    // Return cached response with a hit header (optional)
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set("X-Cache", "HIT");
    return response;
  }

  // 3. Cache miss – generate fresh CSS
  const dynamicTimeText = computeTimeText(now);
  const allCss = `:root{--dynamic-time-text: "${dynamicTimeText}";}${styles}`;

  const freshResponse = new NextResponse(allCss, {
    headers: {
      "Content-Type": "text/css",
      // Browser: 1 min, CDN (Cloudflare): 5 min, stale for 10 min
      "Cache-Control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "X-Cache": "MISS",
    },
  });

  // 4. Store in cache for 2 minutes (slightly longer than the key’s validity)
  //    Use `waitUntil` to avoid blocking the response.
  const responseClone = freshResponse.clone();
  await cache.put(cacheKey, responseClone);

  return freshResponse;
}

// Force dynamic to ensure we always get fresh time when cache misses
export const dynamic = "force-dynamic";