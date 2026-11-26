import { readCfg, saveCfg, validDir } from "@/lib/backup";
import { pglite } from "@/db";
import { jsonError } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ...readCfg(), dbSupported: pglite !== null });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { dir?: string; auto?: boolean };
  const c = readCfg();
  if (typeof b.dir === "string") {
    const d = b.dir.trim().replace(/^"|"$/g, "");
    if (d && !validDir(d)) return jsonError("Enter a full folder path, like D:\\Backups");
    c.dir = d;
  }
  if (typeof b.auto === "boolean") c.auto = b.auto;
  saveCfg(c);
  return Response.json({ ...c, dbSupported: pglite !== null });
}
