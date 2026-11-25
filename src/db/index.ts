import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { mkdirSync } from "node:fs";

// Storage lives on the PC.
// - No DATABASE_URL  -> embedded Postgres (PGlite) saved in ./pc-data/db (zero install on the PC).
// - DATABASE_URL set -> a normal Postgres server.
const databaseUrl = process.env.DATABASE_URL;

const SCHEMA_SQL = `
create table if not exists installed_apps (
  app_id text primary key,
  size_mb integer not null default 1,
  installed_at timestamptz not null default now()
);
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  folder text not null default '/Documents',
  name text not null,
  mime_type text not null default 'text/plain',
  content text not null default '',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists files_folder_idx on files (folder);
create table if not exists app_data (
  app_id text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (app_id, key)
);
`;

type G = typeof globalThis & { __pcDb?: { db: ReturnType<typeof drizzlePg>; ready: Promise<void> } };
const g = globalThis as G;

function create() {
  if (databaseUrl) {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzlePg(pool);
    return { db, ready: pool.query(SCHEMA_SQL).then(() => undefined) };
  }
  const dir = (process.env.PC_DATA_DIR ?? "./data") + "/db";
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client) as unknown as ReturnType<typeof drizzlePg>;
  return { db, ready: client.exec(SCHEMA_SQL).then(() => undefined) };
}

const inst = g.__pcDb ?? (g.__pcDb = create());

export const db = inst.db;
export const dbReady = inst.ready;
