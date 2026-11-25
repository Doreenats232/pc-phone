import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, validToken } from "@/lib/auth";

// PIN gate: only active once a PIN is set (Settings > Security).
export function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;
  const open =
    p === "/unlock" ||
    p === "/connect" ||
    p === "/api/health" ||
    p === "/api/auth/login" ||
    p.startsWith("/_next/") ||
    p.startsWith("/icons/") ||
    p === "/manifest.webmanifest" ||
    p === "/sw.js";
  if (open || validToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (p.startsWith("/api/")) return NextResponse.json({ error: "locked" }, { status: 401 });
  // Redirect to whatever address the phone used (never the server's own "localhost").
  const host = req.headers.get("host") ?? "localhost";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return NextResponse.redirect(new URL("/unlock", `${proto}://${host}`));
}

export const config = { matcher: ["/((?!favicon.ico).*)"] };
