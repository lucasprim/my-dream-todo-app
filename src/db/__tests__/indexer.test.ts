import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import os from "os";
import * as schema from "../schema";
import { fullVaultScan, reindexFile } from "../indexer";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

// Minimal sample vault for testing
const PEOPLE_VAULT_FILES: Record<string, string> = {
  "People/roberto-almeida.md": `---
email: roberto@example.com
company: Acme Corp
---

# Roberto Almeida
`,
  "People/alice-smith.md": `---
email: alice@example.com
---

# Alice Smith
`,
  "Inbox/inbox.md": `---
type: inbox
---

# Inbox

- [ ] Follow up with [[@Roberto Almeida]] 📅 2026-03-10
- [ ] Meeting with [[@Alice Smith]] and [[@Roberto Almeida]]
- [ ] Buy groceries
`,
};

const SAMPLE_VAULT: Record<string, string> = {
  "Inbox/inbox.md": `---
type: inbox
---

# Inbox

- [ ] Buy groceries 📅 2026-03-05
- [x] Call dentist ✅ 2026-03-01
`,
  "Projects/my-project.md": `---
type: project
status: active
tags: [dev]
---

# My Project

- [ ] Implement feature ⏫ 📅 2026-03-10
- [x] Set up repo ✅ 2026-03-01
`,
  "Areas/health.md": `---
type: area
tags: [health]
---

# Health

- [ ] Morning workout 🔁 every day
`,
  "Calendar/2026-03-04.md": `---
type: daily-note
date: 2026-03-04
---

# 2026-03-04

- [ ] Review tasks
`,
};

function createTestVault(dir: string) {
  for (const [relPath, content] of Object.entries(SAMPLE_VAULT)) {
    const fullPath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }
}

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

describe("fullVaultScan", () => {
  let vaultDir: string;
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-test-"));
    createTestVault(vaultDir);
    db = createTestDb();
  });

  afterEach(() => {
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  it("indexes all tasks from the vault", async () => {
    await fullVaultScan(db, vaultDir);
    const allTasks = await db.select().from(schema.tasks);
    // inbox: 2, project: 2, area: 1, daily: 1
    expect(allTasks.length).toBe(6);
  });

  it("indexes projects", async () => {
    await fullVaultScan(db, vaultDir);
    const allProjects = await db.select().from(schema.projects);
    expect(allProjects.length).toBe(1);
    expect(allProjects[0]?.title).toBe("My Project");
    expect(allProjects[0]?.status).toBe("active");
  });

  it("indexes areas", async () => {
    await fullVaultScan(db, vaultDir);
    const allAreas = await db.select().from(schema.areas);
    expect(allAreas.length).toBe(1);
    expect(allAreas[0]?.title).toBe("Health");
  });

  it("indexes daily notes", async () => {
    await fullVaultScan(db, vaultDir);
    const notes = await db.select().from(schema.dailyNotes);
    expect(notes.length).toBe(1);
    expect(notes[0]?.date).toBe("2026-03-04");
  });

  it("correctly marks completed tasks", async () => {
    await fullVaultScan(db, vaultDir);
    const allTasks = await db.select().from(schema.tasks);
    const completed = allTasks.filter((t) => t.completed === 1);
    expect(completed.length).toBe(2); // "Call dentist" + "Set up repo"
  });

  it("stores correct due dates", async () => {
    await fullVaultScan(db, vaultDir);
    const allTasks = await db.select().from(schema.tasks);
    const withDue = allTasks.filter((t) => t.dueDate !== null);
    expect(withDue.length).toBe(2); // "Buy groceries" + "Implement feature"
  });

  it("stores file path on each task", async () => {
    await fullVaultScan(db, vaultDir);
    const allTasks = await db.select().from(schema.tasks);
    for (const task of allTasks) {
      expect(task.filePath).toBeTruthy();
    }
  });

  it("is idempotent — running twice does not duplicate records", async () => {
    await fullVaultScan(db, vaultDir);
    await fullVaultScan(db, vaultDir);
    const allTasks = await db.select().from(schema.tasks);
    expect(allTasks.length).toBe(6);
  });
});

describe("reindexFile", () => {
  let vaultDir: string;
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-test-"));
    createTestVault(vaultDir);
    db = createTestDb();
  });

  afterEach(() => {
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  it("indexes a single file", async () => {
    await reindexFile(db, vaultDir, "Inbox/inbox.md");
    const allTasks = await db.select().from(schema.tasks);
    expect(allTasks.length).toBe(2);
  });

  it("updates existing tasks when file changes", async () => {
    await fullVaultScan(db, vaultDir);

    // Modify inbox file
    const inboxPath = path.join(vaultDir, "Inbox/inbox.md");
    fs.writeFileSync(
      inboxPath,
      `---
type: inbox
---

# Inbox

- [ ] Buy groceries 📅 2026-03-05
- [x] Call dentist ✅ 2026-03-01
- [ ] New task added
`,
      "utf8"
    );

    await reindexFile(db, vaultDir, "Inbox/inbox.md");
    const allTasks = await db.select().from(schema.tasks);
    expect(allTasks.length).toBe(7); // 6 original + 1 new

    const inboxTasks = allTasks.filter((t) =>
      t.filePath === "Inbox/inbox.md"
    );
    expect(inboxTasks.length).toBe(3);
  });

  it("removes tasks when they are deleted from a file", async () => {
    await fullVaultScan(db, vaultDir);

    // Overwrite inbox with fewer tasks
    const inboxPath = path.join(vaultDir, "Inbox/inbox.md");
    fs.writeFileSync(
      inboxPath,
      `---
type: inbox
---

# Inbox

- [ ] Buy groceries 📅 2026-03-05
`,
      "utf8"
    );

    await reindexFile(db, vaultDir, "Inbox/inbox.md");
    const inboxTasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.filePath, "Inbox/inbox.md"));
    expect(inboxTasks.length).toBe(1);
  });
});

describe("people indexing", () => {
  let vaultDir: string;
  let db: ReturnType<typeof createTestDb>;

  function createPeopleVault(dir: string) {
    for (const [relPath, content] of Object.entries(PEOPLE_VAULT_FILES)) {
      const fullPath = path.join(dir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf8");
    }
  }

  beforeEach(() => {
    vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-people-test-"));
    createPeopleVault(vaultDir);
    db = createTestDb();
  });

  afterEach(() => {
    fs.rmSync(vaultDir, { recursive: true, force: true });
  });

  it("discovers people from People/ folder", async () => {
    await fullVaultScan(db, vaultDir);
    const allPeople = await db.select().from(schema.people);
    expect(allPeople.length).toBe(2);
    const names = allPeople.map((p) => p.name).sort();
    expect(names).toEqual(["Alice Smith", "Roberto Almeida"]);
  });

  it("stores frontmatter metadata on people", async () => {
    await fullVaultScan(db, vaultDir);
    const allPeople = await db.select().from(schema.people);
    const roberto = allPeople.find((p) => p.name === "Roberto Almeida");
    expect(roberto?.email).toBe("roberto@example.com");
    expect(roberto?.company).toBe("Acme Corp");
  });

  it("links task mentions to task_people join table", async () => {
    await fullVaultScan(db, vaultDir);
    const allLinks = await db.select().from(schema.taskPeople);
    // Task 1 mentions Roberto (1 link), Task 2 mentions Alice + Roberto (2 links), Task 3 has no mentions
    expect(allLinks.length).toBe(3);
  });

  it("auto-creates person from mention if not in People/ folder", async () => {
    // Add a task mentioning someone not in People/
    const inboxPath = path.join(vaultDir, "Inbox/inbox.md");
    fs.writeFileSync(
      inboxPath,
      `---
type: inbox
---

# Inbox

- [ ] Call [[@Dr. New Person]]
`,
      "utf8"
    );

    await fullVaultScan(db, vaultDir);
    const allPeople = await db.select().from(schema.people);
    const newPerson = allPeople.find((p) => p.name === "@Dr. New Person");
    expect(newPerson).toBeDefined();
    expect(newPerson?.filePath).toBe("People/@Dr. New Person.md");
  });

  it("cleans up people from deleted People/ files on full scan", async () => {
    await fullVaultScan(db, vaultDir);

    // Delete Alice's file
    fs.unlinkSync(path.join(vaultDir, "People/alice-smith.md"));

    await fullVaultScan(db, vaultDir);
    const allPeople = await db.select().from(schema.people);
    // Alice had a filePath, so she gets cleaned up. But she's still mentioned in tasks,
    // so she gets auto-created again (without filePath) during task indexing.
    const alice = allPeople.find((p) => p.name === "@Alice Smith");
    expect(alice?.filePath).toBe("People/@Alice Smith.md");
  });
});
