import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The launcher starts cloudflared and writes its log to <data>/tunnel.log.
const log = () => join(process.env.PC_DATA_DIR ?? "./data", "tunnel.log");

export function tunnelEnabled(): boolean {
  return existsSync(log());
}

export function tunnelUrl(): string | null {
  try {
    const txt = readFileSync(log(), "utf8");
    const all = [...txt.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/g)].filter((m) => m[1] !== "api");
    return all.length ? all[all.length - 1][0] : null;
  } catch {
    return null;
  }
}
