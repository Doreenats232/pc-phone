import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Photos and videos are real files on the PC: <data>/media (thumbnails in <data>/media/.thumbs).
export const dataDir = () => process.env.PC_DATA_DIR ?? "./data";
export const mediaDir = () => join(dataDir(), "media");
export const thumbDir = () => join(mediaDir(), ".thumbs");
export const ensureMediaDirs = () => mkdirSync(thumbDir(), { recursive: true });

export const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  heic: "image/heic", heif: "image/heif",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp", mkv: "video/x-matroska",
};

export const extOf = (n: string) => (n.split(".").pop() ?? "").toLowerCase();
export const kindOf = (n: string): "image" | "video" => (MIME[extOf(n)]?.startsWith("video") ? "video" : "image");

/** Only plain file names we generated ourselves (no folders, no tricks). */
export function safeName(n: string): string | null {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(n) && MIME[extOf(n)] ? n : null;
}

export function mediaBytes(): number {
  try {
    if (!existsSync(mediaDir())) return 0;
    let total = 0;
    for (const f of readdirSync(mediaDir())) {
      const st = statSync(join(mediaDir(), f));
      if (st.isFile()) total += st.size;
    }
    return total;
  } catch {
    return 0;
  }
}
