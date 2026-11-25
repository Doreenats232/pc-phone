// Client-side helpers: JSON API calls and formatting.

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit | null };

export async function api<T = unknown>(url: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, body, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    cache: "no-store",
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...((headers as Record<string, string> | undefined) ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : body,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function fmtBytes(n: number): string {
  if (!isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export const fmtMb = (mb: number) => fmtBytes(mb * 1024 * 1024);

export function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d ? `${d}d ` : ""}${h}h ${m}m`;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
