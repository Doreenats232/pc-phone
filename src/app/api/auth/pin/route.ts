import { COOKIE, checkPin, readAuth, removePin, setPin, tokenFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ enabled: readAuth() !== null });
}

// Body: { action: "set" | "remove", pin?: string, current?: string }
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; pin?: string; current?: string };
  if (readAuth() && !checkPin(b.current ?? "")) return Response.json({ error: "Current PIN is wrong" }, { status: 401 });
  if (b.action === "remove") {
    removePin();
    return Response.json({ enabled: false });
  }
  if (b.action === "set") {
    if (typeof b.pin !== "string" || !/^\d{4,8}$/.test(b.pin)) {
      return Response.json({ error: "PIN must be 4 to 8 digits" }, { status: 400 });
    }
    setPin(b.pin);
    const a = readAuth()!;
    const res = Response.json({ enabled: true });
    res.headers.append("Set-Cookie", `${COOKIE}=${tokenFor(a)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
    return res;
  }
  return Response.json({ error: "Bad request" }, { status: 400 });
}
