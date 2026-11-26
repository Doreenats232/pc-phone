import { createReadStream, createWriteStream, existsSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { jsonError } from "@/lib/server";
import { MIME, ensureMediaDirs, extOf, mediaDir, safeName, thumbDir } from "@/lib/media";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ name: string }> };

function serve(path: string, type: string, req: Request) {
  const size = statSync(path).size;
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : 0;
    let end = m[2] ? Number(m[2]) : size - 1;
    if (!m[1]) { start = Math.max(0, size - Number(m[2])); end = size - 1; }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(Readable.toWeb(createReadStream(path, { start, end })) as unknown as ReadableStream, {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(createReadStream(path)) as unknown as ReadableStream, {
    headers: { ...base, "Content-Length": String(size) },
  });
}

// GET /api/media/NAME            -> the full photo/video (supports seeking)
// GET /api/media/NAME?thumb=1    -> small preview
export async function GET(req: Request, { params }: Ctx) {
  const name = safeName((await params).name);
  if (!name) return jsonError("Not found", 404);
  const thumb = new URL(req.url).searchParams.has("thumb");
  const path = thumb ? join(thumbDir(), name + ".jpg") : join(mediaDir(), name);
  if (!existsSync(path)) return jsonError("Not found", 404);
  return serve(path, thumb ? "image/jpeg" : MIME[extOf(name)], req);
}

// POST /api/media/NAME?thumb=1 (jpeg body): attach a preview to an existing photo.
export async function POST(req: Request, { params }: Ctx) {
  const name = safeName((await params).name);
  if (!name || !existsSync(join(mediaDir(), name))) return jsonError("Not found", 404);
  if (!new URL(req.url).searchParams.has("thumb") || !req.body) return jsonError("Bad request");
  if (Number(req.headers.get("content-length") ?? 0) > 2 * 1024 * 1024) return jsonError("Preview too large", 413);
  ensureMediaDirs();
  await pipeline(Readable.fromWeb(req.body as never), createWriteStream(join(thumbDir(), name + ".jpg")));
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const name = safeName((await params).name);
  if (!name) return jsonError("Not found", 404);
  for (const p of [join(mediaDir(), name), join(thumbDir(), name + ".jpg")]) {
    try { unlinkSync(p); } catch {}
  }
  return Response.json({ ok: true });
}
