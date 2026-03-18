import { NextResponse } from "next/server";
import styles from "../../../generated-css/styles.css.js";

export function GET() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(10, 30, 0, 0);

  const day = now.getDay();
  const isWeekday = day >= 1 && day <= 5;
  const msLeft = cutoff - now;
  const minutesLeft = msLeft > 0 ? Math.ceil(msLeft / 60000) : 0;

  let dynamicTimeText;

  if (isWeekday && msLeft > 0) {
    dynamicTimeText =
      minutesLeft >= 60
        ? `in the next ${Math.ceil(minutesLeft / 60)} hours `
        : `in the next ${minutesLeft} minutes `;
  } else {
    dynamicTimeText = " before 10:30am Mon - Fri ";
  }

  // Simply prepend the dynamic variables - styles are already compiled
  const allCss = `:root{--dynamic-time-text: "${dynamicTimeText}";}${styles}`;

  return new NextResponse(allCss, {
    headers: {
      "Content-Type": "text/css",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      Vary: "Accept-Encoding",
    },
  });
}

// Force dynamic rendering to always get fresh time text
export const dynamic = "force-dynamic";
