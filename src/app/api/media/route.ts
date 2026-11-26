import { createWriteStream, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assertSpace, ensureSeeded, jsonError } from "@/lib/server";
import { MIME, ensureMediaDirs, extOf, kindOf, mediaDir, thumbDir } from "@/lib/media";

export const dynamic = "force-dynamic";

// List photos + videos, newest first.
export async function GET() {
  ensureMediaDirs();
  const items = readdirSync(mediaDir())
    .filter((n) => MIME[extOf(n)] && statSync(join(mediaDir(), n)).isFile())
    .map((name) => {
      const st = statSync(join(mediaDir(), name));
      return { name, size: st.size, mtime: st.mtimeMs, kind: kindOf(name), hasThumb: existsSync(join(thumbDir(), name + ".jpg")) };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return Response.json({ items });
}

// Save one photo/video straight to disk: POST /api/media?name=IMG.jpg  (raw file as body).
export async function POST(req: Request) {
  await ensureSeeded();
  const ext = extOf(new URL(req.url).searchParams.get("name") ?? "");
  if (!MIME[ext]) return jsonError("Unsupported file type", 415);
  if (!req.body) return jsonError("Empty upload");
  const err = await assertSpace(Number(req.headers.get("content-length") ?? 0));
  if (err) return jsonError(err, 507);

  ensureMediaDirs();
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const name = `${stamp}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const path = join(mediaDir(), name);
  try {
    await pipeline(Readable.fromWeb(req.body as never), createWriteStream(path));
  } catch {
    try { unlinkSync(path); } catch {}
    return jsonError("Upload interrupted", 500);
  }
  return Response.json({ name });
}
