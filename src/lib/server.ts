import { db, dbReady } from "@/db";
import { mediaBytes } from "@/lib/media";
import { appData, files, installedApps } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { statfs } from "node:fs/promises";
import os from "node:os";
import { CATALOG, DEFAULT_SETTINGS, FOLDERS, MB, type AppDef, type SystemSettings } from "@/lib/catalog";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export const IDENT = /^[a-zA-Z0-9_.-]{1,64}$/;

export function cleanFolder(v: unknown): string | null {
  return typeof v === "string" && FOLDERS.includes(v) ? v : null;
}

export function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const n = v.replace(/[\\/\u0000-\u001f]/g, "").trim().slice(0, 120);
  return n.length ? n : null;
}

const WELCOME = [
  "Welcome to Home PC Phone!",
  "",
  "This phone is just a screen: apps, files and data all live on your PC.",
  "- Get apps from the Play Store (they use PC storage, not your phone).",
  "- Files, notes and drawings are saved to your PC database.",
  "- Storage limits can be changed in Settings > Storage.",
  "",
  "Phone app: install the APK, enter your PC address once, done.",
].join("\n");

let seedPromise: Promise<void> | null = null;

const NEW_DEFAULTS = [{ flag: "defaults_media", ids: ["camera", "gallery"] }];

// Apps added in later versions get installed once on phones that already exist.
async function addNewDefaults() {
  for (const d of NEW_DEFAULTS) {
    const seen = await db
      .select({ key: appData.key })
      .from(appData)
      .where(and(eq(appData.appId, "system"), eq(appData.key, d.flag)))
      .limit(1);
    if (seen.length) continue;
    const apps = CATALOG.filter((a) => d.ids.includes(a.id));
    await db.insert(installedApps).values(apps.map((a) => ({ appId: a.id, sizeMb: a.sizeMb }))).onConflictDoNothing();
    await db.insert(appData).values({ appId: "system", key: d.flag, value: true }).onConflictDoNothing();
  }
}

async function doSeed() {
  await dbReady;
  const rows = await db
    .select({ key: appData.key })
    .from(appData)
    .where(and(eq(appData.appId, "system"), eq(appData.key, "settings")))
    .limit(1);
  if (rows.length > 0) {
    await addNewDefaults();
    return;
  }

  await db
    .insert(appData)
    .values({ appId: "system", key: "settings", value: DEFAULT_SETTINGS })
    .onConflictDoNothing();
  await db
    .insert(installedApps)
    .values(CATALOG.filter((a) => a.preinstalled).map((a) => ({ appId: a.id, sizeMb: a.sizeMb })))
    .onConflictDoNothing();
  await db.insert(files).values([
    { folder: "/Documents", name: "Welcome.txt", mimeType: "text/plain", content: WELCOME, sizeBytes: Buffer.byteLength(WELCOME, "utf8") },
    { folder: "/Notes", name: "Ideas.txt", mimeType: "text/plain", content: "Ideas\n\n- Build a weather app\n- Learn to draw", sizeBytes: 40 },
  ]);
  await addNewDefaults();
}

/** Idempotent first-boot seeding (shared promise so concurrent requests don't double insert). */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = doSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

export async function getSettings(): Promise<SystemSettings> {
  const rows = await db
    .select({ value: appData.value })
    .from(appData)
    .where(and(eq(appData.appId, "system"), eq(appData.key, "settings")))
    .limit(1);
  return { ...DEFAULT_SETTINGS, ...((rows[0]?.value as Partial<SystemSettings> | undefined) ?? {}) };
}

export async function getUsage() {
  const [a] = await db
    .select({ mb: sql<number>`coalesce(sum(${installedApps.sizeMb}), 0)::int` })
    .from(installedApps);
  const [f] = await db
    .select({ bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)::float8` })
    .from(files);
  const appsMb = Number(a?.mb ?? 0);
  const filesBytes = Number(f?.bytes ?? 0) + mediaBytes();
  return { appsMb, filesBytes, usedBytes: appsMb * MB + filesBytes };
}

/** Returns an error message if adding `extraBytes` would exceed the phone's PC-storage quota. */
export async function assertSpace(extraBytes: number): Promise<string | null> {
  const settings = await getSettings();
  const usage = await getUsage();
  if (usage.usedBytes + extraBytes > settings.quotaMb * MB) {
    return "Not enough PC storage. Free up space or raise the quota in Settings > Storage.";
  }
  return null;
}

export async function getDisk() {
  try {
    const s = await statfs(process.cwd());
    const bs = Number(s.bsize);
    return { totalBytes: Number(s.blocks) * bs, freeBytes: Number(s.bavail) * bs };
  } catch {
    return null;
  }
}

export function getSystemInfo() {
  const cpus = os.cpus();
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model ?? "Unknown CPU",
    cpuCount: cpus.length,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    uptime: os.uptime(),
    serverUptime: process.uptime(),
    nodeVersion: process.version,
  };
}

// ---- Web apps (any website added as an app) ----
export type WebAppRow = { id: string; name: string; url: string };

export async function getWebApps(): Promise<WebAppRow[]> {
  const rows = await db
    .select({ value: appData.value })
    .from(appData)
    .where(and(eq(appData.appId, "system"), eq(appData.key, "webapps")))
    .limit(1);
  return Array.isArray(rows[0]?.value) ? (rows[0].value as WebAppRow[]) : [];
}

export async function setWebApps(list: WebAppRow[]) {
  await db
    .insert(appData)
    .values({ appId: "system", key: "webapps", value: list })
    .onConflictDoUpdate({ target: [appData.appId, appData.key], set: { value: list, updatedAt: new Date() } });
}

const PALETTE: [string, string][] = [
  ["#fca5a5", "#dc2626"], ["#fdba74", "#ea580c"], ["#fcd34d", "#b45309"], ["#86efac", "#15803d"],
  ["#5eead4", "#0f766e"], ["#7dd3fc", "#0284c7"], ["#a5b4fc", "#4338ca"], ["#f0abfc", "#9333ea"],
];

export function webAppToDef(w: WebAppRow): AppDef {
  let host = "";
  try {
    host = new URL(w.url).hostname;
  } catch {}
  let h = 0;
  for (const c of host) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return {
    id: w.id,
    name: w.name,
    icon: (w.name[0] ?? "W").toUpperCase(),
    iconUrl: host ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}` : undefined,
    colors: PALETTE[h % PALETTE.length],
    description: `Website: ${host}`,
    url: w.url,
    category: "Internet",
    sizeMb: 1,
    rating: 0,
    core: false,
    preinstalled: false,
  };
}

export async function allApps(): Promise<AppDef[]> {
  const web = await getWebApps();
  return [...CATALOG, ...web.map(webAppToDef)];
}
