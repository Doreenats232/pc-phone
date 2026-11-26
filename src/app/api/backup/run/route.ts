import { runBackup, readCfg } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST() {
  const r = await runBackup();
  return Response.json({ ...r, cfg: readCfg() }, { status: r.ok ? 200 : 400 });
}
