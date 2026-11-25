import { db } from "@/db";
import { files } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { assertSpace, cleanFolder, cleanName, ensureSeeded, jsonError } from "@/lib/server";

export const dynamic = "force-dynamic";

const listColumns = {
  id: files.id,
  folder: files.folder,
  name: files.name,
  mimeType: files.mimeType,
  sizeBytes: files.sizeBytes,
  createdAt: files.createdAt,
  updatedAt: files.updatedAt,
};

export async function GET(req: Request) {
  await ensureSeeded();
  const folderParam = new URL(req.url).searchParams.get("folder");
  const folder = folderParam ? cleanFolder(folderParam) : null;
  const rows = await db
    .select(listColumns)
    .from(files)
    .where(folder ? eq(files.folder, folder) : undefined)
    .orderBy(asc(files.name));
  return Response.json({ files: rows });
}

export async function POST(req: Request) {
  await ensureSeeded();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid JSON body");

  const folder = cleanFolder(body.folder);
  if (!folder) return jsonError("Invalid folder");
  const name = cleanName(body.name);
  if (!name) return jsonError("Invalid file name");
  const content = typeof body.content === "string" ? body.content : "";
  const mimeType = typeof body.mimeType === "string" && body.mimeType ? body.mimeType.slice(0, 100) : "text/plain";

  const sizeBytes = Buffer.byteLength(content, "utf8");
  const err = await assertSpace(sizeBytes);
  if (err) return jsonError(err, 507);

  const [row] = await db.insert(files).values({ folder, name, mimeType, content, sizeBytes }).returning();
  return Response.json({ file: row }, { status: 201 });
}
