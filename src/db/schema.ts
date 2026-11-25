import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Apps the phone has downloaded. Their "size" is charged against PC storage.
export const installedApps = pgTable("installed_apps", {
  appId: text("app_id").primaryKey(),
  sizeMb: integer("size_mb").notNull().default(1),
  installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
});

// Files live on the PC. Text is stored as-is, binary files as data URLs.
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folder: text("folder").notNull().default("/Documents"),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull().default("text/plain"),
    content: text("content").notNull().default(""),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("files_folder_idx").on(t.folder)],
);

// Generic key/value store used by system settings and per-app data (todo items, high scores, ...).
export const appData = pgTable(
  "app_data",
  {
    appId: text("app_id").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.appId, t.key] })],
);
