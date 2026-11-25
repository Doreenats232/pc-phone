import { db } from "@/db";
import { appData, installedApps } from "@/db/schema";
import { CATALOG, MB } from "@/lib/catalog";
import { assertSpace, ensureSeeded, jsonError } from "@/lib/server";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Download / install an app onto the PC (charged against the phone's PC-storage quota).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = CATALOG.find((a) => a.id === id);
  if (!app) return jsonError("Unknown app", 404);

  await ensureSeeded();
  const existing = await db
    .select({ appId: installedApps.appId })
    .from(installedApps)
    .where(eq(installedApps.appId, id))
    .limit(1);
  if (existing.length > 0) return Response.json({ ok: true, alreadyInstalled: true });

  const err = await assertSpace(app.sizeMb * MB);
  if (err) return jsonError(err, 507);

  await db.insert(installedApps).values({ appId: id, sizeMb: app.sizeMb }).onConflictDoNothing();
  return Response.json({ ok: true });
}

// Uninstall an app and its saved app data.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = CATALOG.find((a) => a.id === id);
  if (!app) return jsonError("Unknown app", 404);
  if (app.core) return jsonError("System apps can't be removed", 403);

  await db.delete(installedApps).where(eq(installedApps.appId, id));
  await db.delete(appData).where(eq(appData.appId, id));
  return Response.json({ ok: true });
}
