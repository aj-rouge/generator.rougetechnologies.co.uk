// app/api/css/route.ts
import { NextResponse } from "next/server";
import styles from "../../../generated-css/styles.css.js";

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
  const minuteKey = now.toISOString().slice(0, 16);
  const cacheKey = `css:${minuteKey}`;

  // Try to get from Cloudflare cache
  let cachedResponse;

  try {
    // `caches` is available only in Cloudflare Workers (not in local dev)
    // @ts-ignore – caches is a global in CF Workers
    const cache = await caches.open("css-cache");
    cachedResponse = await cache.match(cacheKey);
  } catch (err) {
    console.warn("Cache read failed, falling back to fresh generation:", err);
  }

  if (cachedResponse) {
    // Return cached response with hit header
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set("X-Cache", "HIT");
    return response;
  }

  // Generate fresh CSS
  const dynamicTimeText = computeTimeText(now);
  const allCss = `:root{--dynamic-time-text: "${dynamicTimeText}";}${styles}`;

  const freshResponse = new NextResponse(allCss, {
    headers: {
      "Content-Type": "text/css",
      "Cache-Control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "X-Cache": "MISS",
    },
  });

  // Try to store in cache (non‑blocking)
  try {
    // @ts-ignore
    const cache = await caches.open("css-cache");
    // Clone the response because the body can only be read once
    await cache.put(cacheKey, freshResponse.clone());
  } catch (err) {
    console.warn("Cache write failed, proceeding without caching:", err);
  }

  return freshResponse;
}

export const dynamic = "force-dynamic";