import { api } from "@/lib/client";

export type MediaItem = { name: string; size: number; mtime: number; kind: "image" | "video"; hasThumb: boolean };

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "image/heif": "heif",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp", "video/x-matroska": "mkv",
};

/** Small JPEG preview made on the phone before upload (so the gallery loads fast). */
async function makeThumb(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((ok, bad) => {
      img.onload = () => ok();
      img.onerror = () => bad(new Error("decode"));
      img.src = url;
    });
    const s = Math.min(1, 360 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.72));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Sends a photo/video to the PC. Returns its saved name. */
export async function uploadMedia(file: File): Promise<{ name: string; kind: "image" | "video" }> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const useExt = ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext) ? ext : (EXT_BY_MIME[file.type] ?? (file.type.startsWith("video") ? "mp4" : "jpg"));
  const { name } = await api<{ name: string }>(`/api/media?name=${encodeURIComponent("upload." + useExt)}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const thumb = await makeThumb(file);
  if (thumb) await api(`/api/media/${name}?thumb=1`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: thumb }).catch(() => {});
  return { name, kind: file.type.startsWith("video") ? "video" : "image" };
}
