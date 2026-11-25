import { db } from "@/db";
import { installedApps } from "@/db/schema";
import { CATALOG } from "@/lib/catalog";
import { ensureSeeded } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const rows = await db.select().from(installedApps);
  return Response.json({
    catalog: CATALOG,
    installed: rows.map((r) => ({ appId: r.appId, sizeMb: r.sizeMb, installedAt: r.installedAt })),
  });
}
