import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import * as schema from "@/db/schema";
import {
  getTimezone,
  setTimezone,
  getTodayInTimezone,
  formatTimeInTimezone,
} from "../timezone";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

describe("timezone utilities", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  describe("getTimezone", () => {
    it("returns UTC when no setting exists", () => {
      expect(getTimezone(db)).toBe("UTC");
    });

    it("returns the stored timezone", () => {
      setTimezone(db, "America/Sao_Paulo");
      expect(getTimezone(db)).toBe("America/Sao_Paulo");
    });
  });

  describe("setTimezone", () => {
    it("stores a valid timezone", () => {
      setTimezone(db, "Europe/London");
      expect(getTimezone(db)).toBe("Europe/London");
    });

    it("overwrites previous value", () => {
      setTimezone(db, "Europe/London");
      setTimezone(db, "Asia/Tokyo");
      expect(getTimezone(db)).toBe("Asia/Tokyo");
    });

    it("throws on invalid timezone", () => {
      expect(() => setTimezone(db, "Not/A/Timezone")).toThrow();
    });
  });

  describe("getTodayInTimezone", () => {
    it("returns a YYYY-MM-DD string", () => {
      const result = getTodayInTimezone("UTC");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns valid date for different timezones", () => {
      const utc = getTodayInTimezone("UTC");
      const tokyo = getTodayInTimezone("Asia/Tokyo");
      const sp = getTodayInTimezone("America/Sao_Paulo");
      // All should be valid YYYY-MM-DD
      for (const d of [utc, tokyo, sp]) {
        expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(d + "T12:00:00").toString()).not.toBe("Invalid Date");
      }
    });
  });

  describe("formatTimeInTimezone", () => {
    it("formats UTC noon as 12:00 PM in UTC", () => {
      const result = formatTimeInTimezone("2026-03-06T12:00:00Z", "UTC");
      expect(result).toBe("12:00 PM");
    });

    it("converts UTC to a different timezone", () => {
      // UTC midnight = 9 PM previous day in Sao Paulo (UTC-3)
      const result = formatTimeInTimezone(
        "2026-03-06T00:00:00Z",
        "America/Sao_Paulo"
      );
      expect(result).toBe("9:00 PM");
    });

    it("formats with AM/PM correctly", () => {
      const result = formatTimeInTimezone("2026-03-06T06:30:00Z", "UTC");
      expect(result).toBe("6:30 AM");
    });
  });
});
