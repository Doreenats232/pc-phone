import { COOKIE, checkPin, lockRemainingSec, noteFail, noteOk, readAuth, tokenFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = readAuth();
  if (!a) return Response.json({ ok: true });
  const wait = lockRemainingSec();
  if (wait > 0) return Response.json({ error: `Too many tries. Wait ${wait}s.` }, { status: 429 });
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  if (typeof pin !== "string" || !checkPin(pin)) {
    noteFail();
    return Response.json({ error: "Wrong PIN" }, { status: 401 });
  }
  noteOk();
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", `${COOKIE}=${tokenFor(a)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
  return res;
}
