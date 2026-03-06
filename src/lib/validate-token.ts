import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

export function validateToken(db: Db, bearerToken: string): boolean {
  const hash = createHash("sha256").update(bearerToken).digest("hex");
  const rows = db
    .select()
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.tokenHash, hash))
    .limit(1)
    .all();

  if (rows.length === 0) return false;

  // Update last_used_at
  db.update(schema.apiTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(schema.apiTokens.id, rows[0].id))
    .run();

  return true;
}
