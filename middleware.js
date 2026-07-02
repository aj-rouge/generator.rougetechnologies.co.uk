// middleware.js (Located directly in your project root)
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes: login page, API routes, and all static assets
  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check authentication for all other routes
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secretKey = process.env.JWT_SECRET;

    if (!secretKey) {
      console.error(
        "Middleware Error: JWT_SECRET environment variable is missing.",
      );
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const secret = new TextEncoder().encode(secretKey);
    await jwtVerify(sessionCookie, secret);
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware JWT verification failed:", error.message);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Statically define which routes are captured by this global rule
export const config = {
  matcher: ["/:path*"],
};
