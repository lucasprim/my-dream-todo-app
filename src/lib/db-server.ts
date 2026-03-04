import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import path from "path";
import fs from "fs";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "vault.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });
    migrate(_db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  }
  return _db;
}

export function getVaultDir(): string {
  return process.env.VAULT_DIR ?? path.join(process.cwd(), "vault-sample");
}
