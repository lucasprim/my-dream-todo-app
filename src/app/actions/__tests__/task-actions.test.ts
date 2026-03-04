import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import os from "os";
import * as schema from "@/db/schema";
import { fullVaultScan } from "@/db/indexer";

// We test the action logic directly by importing and calling with test DB/vault
import {
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  quickCaptureToInbox,
} from "../task-actions";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

const INITIAL_INBOX = `---
type: inbox
---

# Inbox

- [ ] Existing task
`;

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

describe("task-actions", () => {
  let vaultDir: string;
  let db: ReturnType<typeof createTestDb>;

  beforeEach(async () => {
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-action-test-"));
    // Create inbox
    fs.mkdirSync(path.join(vaultDir, "Inbox"), { recursive: true });
    fs.writeFileSync(path.join(vaultDir, "Inbox/inbox.md"), INITIAL_INBOX, "utf8");
    db = createTestDb();
    await fullVaultScan(db, vaultDir);
  });

  afterEach(() => {
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  describe("createTask", () => {
    it("appends a new task to the target file", async () => {
      await createTask(db, vaultDir, {
        title: "New task",
        filePath: "Inbox/inbox.md",
      });

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Inbox/inbox.md"),
        "utf8"
      );
      expect(fileContent).toContain("- [ ] New task");
    });

    it("adds the task to the SQLite index", async () => {
      await createTask(db, vaultDir, {
        title: "New task",
        filePath: "Inbox/inbox.md",
      });

      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
      expect(tasks.some((t) => t.title === "New task")).toBe(true);
    });

    it("includes optional due date in the task line", async () => {
      await createTask(db, vaultDir, {
        title: "Task with due date",
        filePath: "Inbox/inbox.md",
        dueDate: "2026-03-10",
      });

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Inbox/inbox.md"),
        "utf8"
      );
      expect(fileContent).toContain("📅 2026-03-10");
    });
  });

  describe("updateTask", () => {
    it("updates task title in the file", async () => {
      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
      const task = tasks[0];
      expect(task).toBeDefined();

      await updateTask(db, vaultDir, task!.id, {
        title: "Updated task title",
      });

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Inbox/inbox.md"),
        "utf8"
      );
      expect(fileContent).toContain("- [ ] Updated task title");
      expect(fileContent).not.toContain("Existing task");
    });
  });

  describe("completeTask", () => {
    it("marks task as complete in the file with done date", async () => {
      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
      const task = tasks[0];
      expect(task).toBeDefined();

      await completeTask(db, vaultDir, task!.id);

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Inbox/inbox.md"),
        "utf8"
      );
      expect(fileContent).toContain("- [x]");
      expect(fileContent).toContain("✅");
    });

    it("updates SQLite index to mark task completed", async () => {
      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
      const task = tasks[0]!;
      await completeTask(db, vaultDir, task.id);

      // reindexFile deletes and re-inserts, so query by filePath instead of original ID
      const updated = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
      const completedTasks = updated.filter((t) => t.completed === 1);
      expect(completedTasks).toHaveLength(1);
    });
  });

  describe("deleteTask", () => {
    it("removes task line from the file", async () => {
      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
      const task = tasks[0]!;

      await deleteTask(db, vaultDir, task.id);

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Inbox/inbox.md"),
        "utf8"
      );
      expect(fileContent).not.toContain("Existing task");
    });

    it("removes task from SQLite index", async () => {
      const tasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
      const task = tasks[0]!;

      await deleteTask(db, vaultDir, task.id);

      const remaining = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, task.id));
      expect(remaining).toHaveLength(0);
    });
  });

  describe("quickCaptureToInbox", () => {
    it("appends a task to inbox.md", async () => {
      await quickCaptureToInbox(db, vaultDir, { title: "Quick capture task" });

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Inbox/inbox.md"),
        "utf8"
      );
      expect(fileContent).toContain("- [ ] Quick capture task");
    });

    it("creates inbox.md if it does not exist", async () => {
      fs.unlinkSync(path.join(vaultDir, "Inbox/inbox.md"));

      await quickCaptureToInbox(db, vaultDir, { title: "First task" });

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Inbox/inbox.md"),
        "utf8"
      );
      expect(fileContent).toContain("- [ ] First task");
    });
  });
});
