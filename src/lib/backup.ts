import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { dbReady, pglite } from "@/db";
import { dataDir, mediaDir } from "@/lib/media";

// Backup copies your phone (database snapshot + photos/videos) to a folder you choose, e.g. a USB drive.
export type BackupCfg = { dir: string; auto: boolean; lastRun?: string; lastOk?: boolean; lastMsg?: string };

const cfgFile = () => join(dataDir(), "backup.json");

export function readCfg(): BackupCfg {
  try {
    return { dir: "", auto: false, ...(JSON.parse(readFileSync(cfgFile(), "utf8")) as Partial<BackupCfg>) };
  } catch {
    return { dir: "", auto: false };
  }
}

export function saveCfg(c: BackupCfg) {
  mkdirSync(dataDir(), { recursive: true });
  writeFileSync(cfgFile(), JSON.stringify(c, null, 2));
}

export const validDir = (d: string) => /^[A-Za-z]:[\\/]/.test(d) || d.startsWith("\\\\") || isAbsolute(d);

const RESTORE = `HOW TO RESTORE
1. Close PC Phone.
2. In the PC Phone folder, delete the folder  data\\db
3. Make a new empty folder  data\\db
4. Open Command Prompt in the PC Phone folder and run (use the newest db-*.tar.gz):
     tar -xzf "<this folder>\\db-YYYY-MM-DD.tar.gz" -C data\\db
5. Copy the "media" folder from here into  data\\media  (merge/overwrite).
6. Start PC Phone again.
`;

async function copyTree(src: string, dst: string): Promise<number> {
  let copied = 0;
  await mkdir(dst, { recursive: true });
  for (const e of await readdir(src, { withFileTypes: true })) {
    const s = join(src, e.name);
    const d = join(dst, e.name);
    if (e.isDirectory()) copied += await copyTree(s, d);
    else if (e.isFile()) {
      const same = existsSync(d) && (await stat(d)).size === (await stat(s)).size;
      if (!same) {
        await copyFile(s, d);
        copied++;
      }
    }
  }
  return copied;
}

let running = false;

/** An unreachable drive can make file calls hang forever; give up after a while instead. */
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise((ok, bad) => {
    const t = setTimeout(() => bad(new Error(msg)), ms);
    p.then(
      (v) => { clearTimeout(t); ok(v); },
      (e) => { clearTimeout(t); bad(e); },
    );
  });
}

export async function runBackup(): Promise<{ ok: boolean; message: string }> {
  if (running) return { ok: false, message: "A backup is already running." };
  running = true;
  const cfg = readCfg();
  let res: { ok: boolean; message: string };
  try {
    if (!cfg.dir) throw new Error("Choose a backup folder first.");
    const root = join(cfg.dir, "PCPhone-backup");
    try {
      await withTimeout(mkdir(root, { recursive: true }), 10_000, "timeout");
    } catch {
      throw new Error("Can't use that folder. Is the drive plugged in?");
    }

    let dbNote = "database not backed up (external Postgres)";
    if (pglite) {
      await dbReady;
      const blob = await pglite.dumpDataDir("gzip");
      const stamp = new Date().toISOString().slice(0, 10);
      await writeFile(join(root, `db-${stamp}.tar.gz`), Buffer.from(await blob.arrayBuffer()));
      const olds = (await readdir(root)).filter((n) => /^db-\d{4}-\d{2}-\d{2}\.tar\.gz$/.test(n)).sort().reverse().slice(7);
      for (const o of olds) await unlink(join(root, o)).catch(() => {});
      dbNote = "database saved";
    }

    let files = 0;
    if (existsSync(mediaDir())) files = await copyTree(mediaDir(), join(root, "media"));
    await writeFile(join(root, "RESTORE.txt"), RESTORE);
    res = { ok: true, message: `Done: ${dbNote}, ${files} new photo/video file(s) copied.` };
  } catch (e) {
    res = { ok: false, message: (e as Error).message };
  } finally {
    running = false;
  }
  saveCfg({ ...readCfg(), lastRun: new Date().toISOString(), lastOk: res!.ok, lastMsg: res!.message });
  return res!;
}

// Checks every 30 min; backs up once a day when "automatic" is on.
const g = globalThis as typeof globalThis & { __backupTimer?: boolean };
export function startBackupScheduler() {
  if (g.__backupTimer) return;
  g.__backupTimer = true;
  const tick = () => {
    const c = readCfg();
    if (c.auto && c.dir && (!c.lastRun || Date.now() - Date.parse(c.lastRun) > 24 * 3600 * 1000)) void runBackup();
  };
  setTimeout(tick, 60_000).unref();
  setInterval(tick, 30 * 60_000).unref();
}
