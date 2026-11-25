import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, readAuth, validToken } from "@/lib/auth";

// PIN gate: only active once a PIN is set (Settings > Security).
export function proxy(req: NextRequest) {
  const p = req.nextUrl.pathname;

  // Requests arriving through the internet tunnel carry Cloudflare headers.
  const viaTunnel = req.headers.has("cf-ray") || req.headers.has("cf-connecting-ip");
  if (viaTunnel) {
    if (p === "/connect") return new NextResponse("Not found", { status: 404 });
    if (!readAuth() && p !== "/api/health") {
      // Remote access stays shut until a PIN exists.
      if (p.startsWith("/api/")) return NextResponse.json({ error: "Set a PIN first" }, { status: 403 });
      return new NextResponse(
        '<meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#0b1020;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center"><div><div style="font-size:42px">🔒</div><h2>Remote access is off</h2><p style="color:#94a3b8">Set a PIN first: open PC Phone at home, then Settings &gt; Security. After that, this address works from anywhere.</p></div>',
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
  }
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
