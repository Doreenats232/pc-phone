// Update check: compares this phone app / PC package with the newest GitHub release.
export const REPO = "Doreenats232/pc-phone";
export const APK_URL = `https://github.com/${REPO}/releases/download/latest/PCPhone.apk`;
export const ZIP_URL = `https://github.com/${REPO}/releases/download/latest/PCPhone-for-Windows.zip`;

export type Builds = { app: number | null; pc: number; latest: number | null };

/** Build number of the Android app (from its user-agent), or null when opened in a normal browser. */
export function appBuild(): number | null {
  if (typeof navigator === "undefined") return null;
  const m = /PCPhoneApp\/(\d+)/.exec(navigator.userAgent);
  return m ? Number(m[1]) : null;
}

export async function checkBuilds(): Promise<Builds> {
  const pc = Number(process.env.NEXT_PUBLIC_BUILD ?? 0);
  let latest: number | null = null;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: "no-store" });
    const m = /build=(\d+)/.exec(((await r.json()) as { body?: string }).body ?? "");
    if (m) latest = Number(m[1]);
  } catch {}
  return { app: appBuild(), pc, latest };
}
