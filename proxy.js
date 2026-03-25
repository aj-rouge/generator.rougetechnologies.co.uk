import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes: login page, API routes, and all static assets
  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") || // Next.js internal files
    pathname.startsWith("/static") || // optional, if you have a /static folder
    pathname.startsWith("/api") || // Allow all API routes to bypass authentication
    pathname.includes(".") // any file extension (favicon.ico, etc.)
  ) {
    return NextResponse.next();
  }

  // For all other routes (non-API), check authentication
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(sessionCookie, secret);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/:path*"],
};
