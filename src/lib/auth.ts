import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

// Optional PIN lock. Stored in <data>/auth.json (never in the database).
type AuthFile = { salt: string; hash: string; secret: string };

export const COOKIE = "pcp_auth";
const file = () => join(process.env.PC_DATA_DIR ?? "./data", "auth.json");

export function readAuth(): AuthFile | null {
  try {
    const f = file();
    if (!existsSync(f)) return null;
    return JSON.parse(readFileSync(f, "utf8")) as AuthFile;
  } catch {
    return null;
  }
}

const hashPin = (pin: string, salt: string) => scryptSync(pin, salt, 32).toString("hex");

export function setPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const a: AuthFile = { salt, hash: hashPin(pin, salt), secret: randomBytes(32).toString("hex") };
  mkdirSync(dirname(file()), { recursive: true });
  writeFileSync(file(), JSON.stringify(a));
}

export function removePin() {
  try {
    unlinkSync(file());
  } catch {}
}

export function checkPin(pin: string): boolean {
  const a = readAuth();
  if (!a) return true;
  const x = Buffer.from(hashPin(pin, a.salt), "hex");
  const y = Buffer.from(a.hash, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export const tokenFor = (a: AuthFile) => createHmac("sha256", a.secret).update("pcphone-ok").digest("hex");

export function validToken(token: string | undefined): boolean {
  const a = readAuth();
  if (!a) return true;
  if (!token) return false;
  const x = Buffer.from(token);
  const y = Buffer.from(tokenFor(a));
  return x.length === y.length && timingSafeEqual(x, y);
}

// Simple brute-force brake: 5 wrong PINs -> locked for a while (grows each time).
let fails = 0;
let lockedUntil = 0;
export function lockRemainingSec(): number {
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}
export function noteFail() {
  fails++;
  if (fails >= 5) {
    lockedUntil = Date.now() + Math.min(600, 30 * 2 ** Math.floor((fails - 5) / 5)) * 1000;
  }
}
export function noteOk() {
  fails = 0;
  lockedUntil = 0;
}
