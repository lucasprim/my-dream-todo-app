import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import os from "os";
import matter from "gray-matter";
import * as schema from "@/db/schema";
import { fullVaultScan } from "@/db/indexer";
import {
  getTasksScheduledForDate,
  getCarryForwardTasks,
  getAvailableTasksForPlanning,
} from "@/db/queries";
import {
  scheduleTaskForDate,
  unscheduleTask,
} from "../task-actions-impl";
import {
  finishPlanning,
  reopenPlanning,
  isPlanningComplete,
  createOrGetDailyNote,
  syncDailyNoteTasks,
} from "../daily-note-actions-impl";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

const PROJECT_FILE = `---
status: active
---

# Test Project

- [ ] Project task A
- [ ] Project task B ⏳ 2026-03-05
`;

const AREA_FILE = `---
---

# Work Area

- [ ] Area task C
`;

const INBOX_FILE = `---
type: inbox
---

# Inbox

- [ ] Inbox task D
- [ ] Inbox task E ⏳ 2026-03-04
`;

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

describe("daily-planning queries and actions", () => {
  let vaultDir: string;
  let db: ReturnType<typeof createTestDb>;

  beforeEach(async () => {
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-planning-test-"));

    fs.mkdirSync(path.join(vaultDir, "Inbox"), { recursive: true });
    fs.mkdirSync(path.join(vaultDir, "Projects"), { recursive: true });
    fs.mkdirSync(path.join(vaultDir, "Areas"), { recursive: true });
    fs.mkdirSync(path.join(vaultDir, "Calendar"), { recursive: true });

    fs.writeFileSync(path.join(vaultDir, "Inbox/inbox.md"), INBOX_FILE, "utf8");
    fs.writeFileSync(path.join(vaultDir, "Projects/Test Project.md"), PROJECT_FILE, "utf8");
    fs.writeFileSync(path.join(vaultDir, "Areas/Work Area.md"), AREA_FILE, "utf8");

    db = createTestDb();
    await fullVaultScan(db, vaultDir);
  });

  afterEach(() => {
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  // ── Query Tests ──────────────────────────────────────────────────────────

  describe("getTasksScheduledForDate", () => {
    it("returns tasks scheduled for the given date", async () => {
      const tasks = await getTasksScheduledForDate(db, "2026-03-05");
      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.title).toBe("Project task B");
    });

    it("excludes completed tasks", async () => {
      // Complete the scheduled task in DB directly
      const [task] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.scheduledDate, "2026-03-05"));
      await db
        .update(schema.tasks)
        .set({ completed: 1 })
        .where(eq(schema.tasks.id, task!.id));

      const tasks = await getTasksScheduledForDate(db, "2026-03-05");
      expect(tasks).toHaveLength(0);
    });

    it("returns empty array when no tasks scheduled", async () => {
      const tasks = await getTasksScheduledForDate(db, "2099-01-01");
      expect(tasks).toHaveLength(0);
    });
  });

  describe("getCarryForwardTasks", () => {
    it("returns tasks scheduled before today", async () => {
      const tasks = await getCarryForwardTasks(db, "2026-03-05");
      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.title).toBe("Inbox task E");
    });

    it("does not return tasks scheduled for today", async () => {
      const tasks = await getCarryForwardTasks(db, "2026-03-05");
      const titles = tasks.map((t) => t.title);
      expect(titles).not.toContain("Project task B");
    });

    it("returns empty when no past scheduled tasks", async () => {
      const tasks = await getCarryForwardTasks(db, "2020-01-01");
      expect(tasks).toHaveLength(0);
    });
  });

  describe("getAvailableTasksForPlanning", () => {
    it("returns uncompleted tasks not scheduled for the given date", async () => {
      const tasks = await getAvailableTasksForPlanning(db, "2026-03-05");
      const titles = tasks.map((t) => t.title);

      // Project task B is scheduled for 2026-03-05, so it should be excluded
      expect(titles).not.toContain("Project task B");

      // Others should be included
      expect(titles).toContain("Project task A");
      expect(titles).toContain("Area task C");
      expect(titles).toContain("Inbox task D");
      // Inbox task E is scheduled for 2026-03-04, not 2026-03-05, so included
      expect(titles).toContain("Inbox task E");
    });

    it("classifies tasks by source", async () => {
      const tasks = await getAvailableTasksForPlanning(db, "2026-03-05");

      const inboxTask = tasks.find((t) => t.title === "Inbox task D");
      expect(inboxTask?.source).toBe("inbox");

      const projectTask = tasks.find((t) => t.title === "Project task A");
      expect(projectTask?.source).toBe("project");

      const areaTask = tasks.find((t) => t.title === "Area task C");
      expect(areaTask?.source).toBe("area");
    });

    it("includes project and area titles", async () => {
      const tasks = await getAvailableTasksForPlanning(db, "2026-03-05");

      const projectTask = tasks.find((t) => t.title === "Project task A");
      expect(projectTask?.projectTitle).toBe("Test Project");

      const areaTask = tasks.find((t) => t.title === "Area task C");
      expect(areaTask?.areaTitle).toBe("Work Area");
    });
  });

  // ── Schedule / Unschedule Action Tests ─────────────────────────────────

  describe("scheduleTaskForDate", () => {
    it("sets scheduledDate on the task in .md file and DB", async () => {
      const allTasks = await db.select().from(schema.tasks);
      const task = allTasks.find((t) => t.title === "Project task A");
      expect(task).toBeDefined();

      await scheduleTaskForDate(db, vaultDir, task!.id, "2026-03-05");

      // Check .md file contains ⏳ emoji
      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Projects/Test Project.md"),
        "utf8"
      );
      expect(fileContent).toContain("⏳ 2026-03-05");

      // Check DB is updated
      const scheduled = await getTasksScheduledForDate(db, "2026-03-05");
      const titles = scheduled.map((t) => t.title);
      expect(titles).toContain("Project task A");
    });
  });

  describe("unscheduleTask", () => {
    it("clears scheduledDate from .md file and DB", async () => {
      // Project task B already has ⏳ 2026-03-05
      const allTasks = await db.select().from(schema.tasks);
      const task = allTasks.find((t) => t.title === "Project task B");
      expect(task).toBeDefined();
      expect(task!.scheduledDate).toBe("2026-03-05");

      await unscheduleTask(db, vaultDir, task!.id);

      // Check .md file no longer contains the scheduled date for task B
      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Projects/Test Project.md"),
        "utf8"
      );
      // The line for task B should no longer have ⏳
      const lines = fileContent.split("\n");
      const taskBLine = lines.find((l) => l.includes("Project task B"));
      expect(taskBLine).not.toContain("⏳");

      // Check DB
      const scheduled = await getTasksScheduledForDate(db, "2026-03-05");
      const titles = scheduled.map((t) => t.title);
      expect(titles).not.toContain("Project task B");
    });
  });

  // ── Planning Status Action Tests ───────────────────────────────────────

  describe("finishPlanning / reopenPlanning", () => {
    it("sets planned: true in daily note frontmatter", async () => {
      await finishPlanning(db, vaultDir, "2026-03-05");

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Calendar/2026-03-05.md"),
        "utf8"
      );
      const parsed = matter(fileContent);
      expect(parsed.data.planned).toBe(true);
    });

    it("sets planned: false when reopening", async () => {
      await finishPlanning(db, vaultDir, "2026-03-05");
      await reopenPlanning(db, vaultDir, "2026-03-05");

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Calendar/2026-03-05.md"),
        "utf8"
      );
      const parsed = matter(fileContent);
      expect(parsed.data.planned).toBe(false);
    });

    it("creates daily note if it does not exist", async () => {
      const notePath = path.join(vaultDir, "Calendar/2026-03-06.md");
      expect(fs.existsSync(notePath)).toBe(false);

      await finishPlanning(db, vaultDir, "2026-03-06");

      expect(fs.existsSync(notePath)).toBe(true);
      const parsed = matter(fs.readFileSync(notePath, "utf8"));
      expect(parsed.data.planned).toBe(true);
    });
  });

  describe("syncDailyNoteTasks", () => {
    it("writes scheduled tasks into daily note ## Tasks section", async () => {
      await syncDailyNoteTasks(db, vaultDir, "2026-03-05");

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Calendar/2026-03-05.md"),
        "utf8"
      );
      // Project task B is scheduled for 2026-03-05
      expect(fileContent).toContain("Project task B");
      expect(fileContent).toContain("## Tasks");
    });

    it("updates daily note when tasks are scheduled/unscheduled", async () => {
      // Schedule a new task for today
      const allTasks = await db.select().from(schema.tasks);
      const taskA = allTasks.find((t) => t.title === "Project task A");
      expect(taskA).toBeDefined();

      await scheduleTaskForDate(db, vaultDir, taskA!.id, "2026-03-05");

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Calendar/2026-03-05.md"),
        "utf8"
      );
      expect(fileContent).toContain("Project task A");
      expect(fileContent).toContain("Project task B");
    });

    it("finishPlanning writes tasks and sets planned flag", async () => {
      await finishPlanning(db, vaultDir, "2026-03-05");

      const fileContent = fs.readFileSync(
        path.join(vaultDir, "Calendar/2026-03-05.md"),
        "utf8"
      );
      const parsed = matter(fileContent);
      expect(parsed.data.planned).toBe(true);
      // Should contain the scheduled task
      expect(fileContent).toContain("Project task B");
    });
  });

  describe("isPlanningComplete", () => {
    it("returns true when planned: true", () => {
      const content = `---\nplanned: true\ndate: 2026-03-05\n---\n\n# Notes\n`;
      expect(isPlanningComplete(content)).toBe(true);
    });

    it("returns false when planned: false", () => {
      const content = `---\nplanned: false\ndate: 2026-03-05\n---\n\n# Notes\n`;
      expect(isPlanningComplete(content)).toBe(false);
    });

    it("returns false when planned field is missing", () => {
      const content = `---\ndate: 2026-03-05\n---\n\n# Notes\n`;
      expect(isPlanningComplete(content)).toBe(false);
    });
  });
});
