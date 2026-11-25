import { db } from "@/db";
import { installedApps } from "@/db/schema";
import { allApps, ensureSeeded } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const rows = await db.select().from(installedApps);
  return Response.json({
    catalog: await allApps(),
    installed: rows.map((r) => ({ appId: r.appId, sizeMb: r.sizeMb, installedAt: r.installedAt })),
  });
}
