import { createHash, randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function generateToken(db: Db): Promise<string> {
  const plaintext = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(plaintext);
  const now = new Date().toISOString();

  db.insert(schema.apiTokens)
    .values({ tokenHash, name: "default", createdAt: now })
    .run();

  return plaintext;
}

export async function deleteAllTokens(db: Db): Promise<void> {
  db.delete(schema.apiTokens).run();
}

export async function hasToken(db: Db): Promise<boolean> {
  const rows = db.select().from(schema.apiTokens).limit(1).all();
  return rows.length > 0;
}
