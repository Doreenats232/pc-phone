import { db, dbReady } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function GET() {
  try {
    await dbReady;
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers: CORS });
  } catch {
    return Response.json({ ok: false }, { status: 500, headers: CORS });
  }
}
