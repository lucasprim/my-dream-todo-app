import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import path from "path";
import * as schema from "@/db/schema";
import { calendarSyncInputSchema } from "../schema";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

function createToken(db: ReturnType<typeof createTestDb>): string {
  const plaintext = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(plaintext).digest("hex");
  db.insert(schema.apiTokens)
    .values({ tokenHash: hash, name: "test", createdAt: new Date().toISOString() })
    .run();
  return plaintext;
}

function makeEvent(overrides: Partial<Record<string, string>> = {}) {
  return {
    external_id: overrides.external_id ?? "evt-1",
    title: overrides.title ?? "Team Standup",
    start_time: "2026-03-06T09:00:00Z",
    end_time: "2026-03-06T09:30:00Z",
    location: "Room A",
    calendar_name: "Work",
    date: "2026-03-06",
    ...overrides,
  };
}

describe("calendar sync", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  describe("Zod schema validation", () => {
    it("accepts valid events", () => {
      const result = calendarSyncInputSchema.safeParse({
        events: [makeEvent()],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty events array", () => {
      const result = calendarSyncInputSchema.safeParse({ events: [] });
      expect(result.success).toBe(false);
    });

    it("rejects event with missing title", () => {
      const result = calendarSyncInputSchema.safeParse({
        events: [{ ...makeEvent(), title: "" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid date format", () => {
      const result = calendarSyncInputSchema.safeParse({
        events: [{ ...makeEvent(), date: "March 6" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid datetime format for start_time", () => {
      const result = calendarSyncInputSchema.safeParse({
        events: [{ ...makeEvent(), start_time: "not-a-date" }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("token validation", () => {
    it("validates correct token", () => {
      const token = createToken(db);
      const hash = createHash("sha256").update(token).digest("hex");
      const rows = db
        .select()
        .from(schema.apiTokens)
        .where(eq(schema.apiTokens.tokenHash, hash))
        .all();
      expect(rows.length).toBe(1);
    });

    it("rejects incorrect token", () => {
      createToken(db);
      const hash = createHash("sha256").update("wrong-token").digest("hex");
      const rows = db
        .select()
        .from(schema.apiTokens)
        .where(eq(schema.apiTokens.tokenHash, hash))
        .all();
      expect(rows.length).toBe(0);
    });
  });

  describe("upsert behavior", () => {
    it("inserts new events", () => {
      const now = new Date().toISOString();
      const event = makeEvent();

      db.insert(schema.calendarEvents)
        .values({
          externalId: event.external_id,
          title: event.title,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          calendarName: event.calendar_name,
          date: event.date,
          completed: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const rows = db.select().from(schema.calendarEvents).all();
      expect(rows.length).toBe(1);
      expect(rows[0].title).toBe("Team Standup");
    });

    it("updates existing events by external_id", () => {
      const now = new Date().toISOString();
      const event = makeEvent();

      // Insert first
      db.insert(schema.calendarEvents)
        .values({
          externalId: event.external_id,
          title: event.title,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          calendarName: event.calendar_name,
          date: event.date,
          completed: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Update
      db.update(schema.calendarEvents)
        .set({ title: "Updated Standup", updatedAt: now })
        .where(eq(schema.calendarEvents.externalId, event.external_id))
        .run();

      const rows = db.select().from(schema.calendarEvents).all();
      expect(rows.length).toBe(1);
      expect(rows[0].title).toBe("Updated Standup");
    });

    it("preserves completion status on upsert", () => {
      const now = new Date().toISOString();
      const event = makeEvent();

      // Insert and mark complete
      db.insert(schema.calendarEvents)
        .values({
          externalId: event.external_id,
          title: event.title,
          startTime: event.start_time,
          endTime: event.end_time,
          date: event.date,
          completed: 1,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Update title (simulating sync) but don't touch completed
      db.update(schema.calendarEvents)
        .set({ title: "Renamed Meeting", updatedAt: now })
        .where(eq(schema.calendarEvents.externalId, event.external_id))
        .run();

      const rows = db.select().from(schema.calendarEvents).all();
      expect(rows[0].completed).toBe(1);
      expect(rows[0].title).toBe("Renamed Meeting");
    });
  });
});
