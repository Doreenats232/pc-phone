import { ensureSeeded, getDisk, getSettings, getSystemInfo, getUsage } from "@/lib/server";

export const dynamic = "force-dynamic";

// PC storage usage + real disk stats + PC system info (used by the phone's Settings and home widget).
export async function GET() {
  await ensureSeeded();
  const [settings, usage, disk] = await Promise.all([getSettings(), getUsage(), getDisk()]);
  return Response.json({
    quotaMb: settings.quotaMb,
    appsMb: usage.appsMb,
    filesBytes: usage.filesBytes,
    usedBytes: usage.usedBytes,
    disk,
    system: getSystemInfo(),
  });
}
