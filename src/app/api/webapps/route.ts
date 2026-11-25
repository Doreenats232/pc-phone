import { db } from "@/db";
import { installedApps } from "@/db/schema";
import { MB } from "@/lib/catalog";
import { assertSpace, ensureSeeded, getWebApps, jsonError, setWebApps, webAppToDef } from "@/lib/server";

export const dynamic = "force-dynamic";

// Add any website as an app.
export async function POST(req: Request) {
  await ensureSeeded();
  const b = (await req.json().catch(() => ({}))) as { url?: string; name?: string };
  let raw = (b.url ?? "").trim();
  if (!raw) return jsonError("Enter a website address");
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return jsonError("That doesn't look like a website address");
  }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return jsonError("That doesn't look like a website address");

  const list = await getWebApps();
  if (list.length >= 60) return jsonError("Too many web apps (max 60)");
  const host = u.hostname.replace(/^www\./, "");
  const name = (b.name ?? "").trim().slice(0, 30) || host.split(".")[0].replace(/^./, (c) => c.toUpperCase());
  const id = `web-${host.replace(/[^a-z0-9]/gi, "").slice(0, 20).toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;

  const err = await assertSpace(1 * MB);
  if (err) return jsonError(err, 507);

  const row = { id, name, url: u.toString() };
  await setWebApps([...list, row]);
  await db.insert(installedApps).values({ appId: id, sizeMb: 1 }).onConflictDoNothing();
  return Response.json({ app: webAppToDef(row) });
}
