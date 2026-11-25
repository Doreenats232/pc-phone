import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { assertSpace, cleanFolder, cleanName, jsonError } from "@/lib/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Invalid id");
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return jsonError("File not found", 404);
  return Response.json({ file: row });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Invalid id");

  const [existing] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!existing) return jsonError("File not found", 404);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid JSON body");

  const update: Partial<typeof files.$inferInsert> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const n = cleanName(body.name);
    if (!n) return jsonError("Invalid file name");
    update.name = n;
  }
  if (body.folder !== undefined) {
    const f = cleanFolder(body.folder);
    if (!f) return jsonError("Invalid folder");
    update.folder = f;
  }
  if (typeof body.mimeType === "string") update.mimeType = body.mimeType.slice(0, 100);
  if (typeof body.content === "string") {
    const size = Buffer.byteLength(body.content, "utf8");
    const err = await assertSpace(size - existing.sizeBytes);
    if (err) return jsonError(err, 507);
    update.content = body.content;
    update.sizeBytes = size;
  }

  const [row] = await db.update(files).set(update).where(eq(files.id, id)).returning();
  return Response.json({ file: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Invalid id");
  await db.delete(files).where(eq(files.id, id));
  return Response.json({ ok: true });
}
