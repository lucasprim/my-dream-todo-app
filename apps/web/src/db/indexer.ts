import fs from "fs";
import path from "path";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { parseMarkdownFile } from "@/lib/markdown/file-parser";
import { VAULT_DIRS } from "@/lib/vault-config";
import * as schema from "./schema";
import type { NewDbTask, NewProject, NewArea, NewDailyNote, NewPerson } from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugFromPath(filePath: string): string {
  return path.basename(filePath, ".md")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tagsToJson(tags: string[]): string {
  return JSON.stringify(tags);
}

function toIso(date: Date): string {
  return date.toISOString();
}

function walkMarkdownFiles(dir: string, base = dir): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdownFiles(fullPath, base));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(path.relative(base, fullPath));
    }
  }
  return results;
}

function classifyFile(
  filePath: string
): "inbox" | "project" | "area" | "daily-note" | "people" | "other" {
  const dir = filePath.split("/")[0];
  if (dir === VAULT_DIRS.INBOX) return "inbox";
  if (dir === VAULT_DIRS.PROJECTS) return "project";
  if (dir === VAULT_DIRS.AREAS) return "area";
  if (dir === VAULT_DIRS.CALENDAR) return "daily-note";
  if (dir === VAULT_DIRS.PEOPLE) return "people";
  return "other";
}

/**
 * Resolve a person name to a person ID. If the person doesn't exist, create
 * them in both the DB and the vault (People/ folder).
 */
async function resolveOrCreatePerson(
  db: Db,
  vaultDir: string,
  name: string,
  now: Date
): Promise<number> {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const existing = await db
    .select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.slug, slug))
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    return existing[0].id;
  }

  // Create a vault file so the person shows up in Obsidian
  // Prefix with @ to match Obsidian convention for people notes
  const displayName = `@${name}`;
  const relPath = `${VAULT_DIRS.PEOPLE}/${displayName}.md`;
  const fullPath = path.join(vaultDir, relPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `# ${displayName}\n`, "utf8");
  }

  const result = await db
    .insert(schema.people)
    .values({ slug, name: displayName, filePath: relPath, updatedAt: toIso(now) })
    .returning({ id: schema.people.id });

  return result[0]!.id;
}

// ── Index a single file ───────────────────────────────────────────────────────

async function indexFile(
  db: Db,
  vaultDir: string,
  relPath: string,
  now: Date
): Promise<void> {
  const fullPath = path.join(vaultDir, relPath);
  const content = fs.readFileSync(fullPath, "utf8");
  const parsed = parseMarkdownFile(content, relPath);
  let kind = classifyFile(relPath);
  const fm = parsed.frontmatter;

  // Treat files with type: daily-note frontmatter as daily notes regardless of directory
  if (fm["type"] === "daily-note" && kind !== "daily-note") {
    kind = "daily-note";
  }

  let projectId: number | null = null;
  let areaId: number | null = null;

  if (kind === "project") {
    const existing = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.filePath, relPath))
      .limit(1);

    const project: NewProject = {
      slug: slugFromPath(relPath),
      title: parsed.title ?? slugFromPath(relPath),
      status: (fm["status"] as NewProject["status"]) ?? "active",
      filePath: relPath,
      tags: tagsToJson((fm["tags"] as string[]) ?? []),
      updatedAt: toIso(now),
    };

    if (existing.length > 0 && existing[0]) {
      await db
        .update(schema.projects)
        .set(project)
        .where(eq(schema.projects.id, existing[0].id));
      projectId = existing[0].id;
    } else {
      const result = await db.insert(schema.projects).values(project).returning({ id: schema.projects.id });
      projectId = result[0]?.id ?? null;
    }
  }

  if (kind === "area") {
    const existing = await db
      .select({ id: schema.areas.id })
      .from(schema.areas)
      .where(eq(schema.areas.filePath, relPath))
      .limit(1);

    const area: NewArea = {
      slug: slugFromPath(relPath),
      title: parsed.title ?? slugFromPath(relPath),
      filePath: relPath,
      tags: tagsToJson((fm["tags"] as string[]) ?? []),
      updatedAt: toIso(now),
    };

    if (existing.length > 0 && existing[0]) {
      await db
        .update(schema.areas)
        .set(area)
        .where(eq(schema.areas.id, existing[0].id));
      areaId = existing[0].id;
    } else {
      const result = await db.insert(schema.areas).values(area).returning({ id: schema.areas.id });
      areaId = result[0]?.id ?? null;
    }
  }

  if (kind === "daily-note") {
    // YAML auto-parses date values as Date objects — convert to YYYY-MM-DD string
    const rawDate = fm["date"];
    let dateStr: string;
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().slice(0, 10);
    } else if (typeof rawDate === "string") {
      dateStr = rawDate;
    } else {
      dateStr = path.basename(relPath, ".md");
    }
    const existing = await db
      .select({ id: schema.dailyNotes.id })
      .from(schema.dailyNotes)
      .where(eq(schema.dailyNotes.filePath, relPath))
      .limit(1);

    const note: NewDailyNote = {
      date: dateStr,
      filePath: relPath,
      content: content,
      updatedAt: toIso(now),
    };

    if (existing.length > 0) {
      await db
        .update(schema.dailyNotes)
        .set(note)
        .where(eq(schema.dailyNotes.filePath, relPath));
    } else {
      await db.insert(schema.dailyNotes).values(note);
    }
  }

  if (kind === "people") {
    const name = parsed.title ?? path.basename(relPath, ".md");
    const slug = slugFromPath(relPath);
    const existing = await db
      .select({ id: schema.people.id })
      .from(schema.people)
      .where(eq(schema.people.slug, slug))
      .limit(1);

    const person: NewPerson = {
      slug,
      name,
      filePath: relPath,
      email: (fm["email"] as string) ?? null,
      company: (fm["company"] as string) ?? null,
      updatedAt: toIso(now),
    };

    if (existing.length > 0 && existing[0]) {
      await db
        .update(schema.people)
        .set(person)
        .where(eq(schema.people.id, existing[0].id));
    } else {
      await db.insert(schema.people).values(person);
    }
  }

  // Upsert tasks for this file, preserving stable IDs across reindexes.
  // Skip task indexing for daily notes — their task lines are display copies
  // synced from real task files; indexing them creates orphaned duplicates.
  if (kind !== "daily-note" && parsed.tasks.length > 0) {
    // Track which line numbers are still present so we can delete removed tasks
    const currentLineNumbers = new Set(
      parsed.tasks.map((t) => t.lineNumber).filter((ln): ln is number => ln != null)
    );

    const taskIds: { id: number; index: number }[] = [];

    for (let i = 0; i < parsed.tasks.length; i++) {
      const t = parsed.tasks[i]!;
      const taskData = {
        taskId: t.taskId,
        title: t.title,
        completed: t.completed ? 1 : 0,
        priority: t.priority,
        dueDate: t.dueDate ?? null,
        doneDate: t.doneDate ?? null,
        scheduledDate: t.scheduledDate ?? null,
        createdDate: t.createdDate ?? null,
        startDate: t.startDate ?? null,
        recurrence: t.recurrence ?? null,
        tags: tagsToJson(t.tags ?? []),
        notes: t.notes ?? null,
        filePath: relPath,
        lineNumber: t.lineNumber ?? null,
        projectId,
        areaId,
        updatedAt: toIso(now),
      };

      // Try to find existing task by filePath + lineNumber (stable identifier)
      const existing = t.lineNumber != null
        ? db
            .select({ id: schema.tasks.id })
            .from(schema.tasks)
            .where(
              and(
                eq(schema.tasks.filePath, relPath),
                eq(schema.tasks.lineNumber, t.lineNumber)
              )
            )
            .get()
        : undefined;

      if (existing) {
        await db
          .update(schema.tasks)
          .set(taskData)
          .where(eq(schema.tasks.id, existing.id))
          .run();
        taskIds.push({ id: existing.id, index: i });
      } else {
        const [inserted] = await db
          .insert(schema.tasks)
          .values(taskData)
          .returning({ id: schema.tasks.id });
        if (inserted) {
          taskIds.push({ id: inserted.id, index: i });
        }
      }
    }

    // Delete tasks that no longer exist in the file (removed lines)
    const existingTasks = await db
      .select({ id: schema.tasks.id, lineNumber: schema.tasks.lineNumber })
      .from(schema.tasks)
      .where(eq(schema.tasks.filePath, relPath))
      .all();
    for (const t of existingTasks) {
      if (t.lineNumber != null && !currentLineNumbers.has(t.lineNumber)) {
        await db.delete(schema.taskPeople).where(eq(schema.taskPeople.taskId, t.id));
        await db.delete(schema.tasks).where(eq(schema.tasks.id, t.id));
      }
    }

    // Link task mentions to people
    for (const { id, index } of taskIds) {
      const mentions = parsed.tasks[index]?.mentions ?? [];
      if (mentions.length === 0) continue;

      // Clear existing mentions for this task and re-link
      await db.delete(schema.taskPeople).where(eq(schema.taskPeople.taskId, id));
      for (const mentionName of mentions) {
        const personId = await resolveOrCreatePerson(db, vaultDir, mentionName, now);
        await db
          .insert(schema.taskPeople)
          .values({ taskId: id, personId });
      }
    }
  } else {
    // No tasks in parsed result (or daily note) — remove all tasks for this file
    await db.delete(schema.tasks).where(eq(schema.tasks.filePath, relPath));
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full vault scan: walk all .md files in vaultDir and populate the SQLite index.
 * Idempotent — safe to run multiple times.
 */
export async function fullVaultScan(db: Db, vaultDir: string): Promise<void> {
  const files = walkMarkdownFiles(vaultDir);
  const fileSet = new Set(files);
  const now = new Date();

  // Remove records whose source files no longer exist
  const dbProjects = await db.select({ id: schema.projects.id, filePath: schema.projects.filePath }).from(schema.projects);
  for (const p of dbProjects) {
    if (!fileSet.has(p.filePath)) {
      await db.delete(schema.tasks).where(eq(schema.tasks.projectId, p.id));
      await db.delete(schema.projects).where(eq(schema.projects.id, p.id));
    }
  }

  const dbAreas = await db.select({ id: schema.areas.id, filePath: schema.areas.filePath }).from(schema.areas);
  for (const a of dbAreas) {
    if (!fileSet.has(a.filePath)) {
      await db.delete(schema.tasks).where(eq(schema.tasks.areaId, a.id));
      await db.delete(schema.areas).where(eq(schema.areas.id, a.id));
    }
  }

  const dbNotes = await db.select({ filePath: schema.dailyNotes.filePath }).from(schema.dailyNotes);
  for (const n of dbNotes) {
    if (!fileSet.has(n.filePath)) {
      await db.delete(schema.dailyNotes).where(eq(schema.dailyNotes.filePath, n.filePath));
    }
  }

  // Clean up orphaned people (from deleted People/ files)
  const dbPeople = await db
    .select({ id: schema.people.id, filePath: schema.people.filePath })
    .from(schema.people);
  for (const p of dbPeople) {
    if (p.filePath && !fileSet.has(p.filePath)) {
      await db.delete(schema.taskPeople).where(eq(schema.taskPeople.personId, p.id));
      await db.delete(schema.people).where(eq(schema.people.id, p.id));
    }
  }

  // Also clean up orphaned tasks (from inbox or other deleted files)
  const dbTasks = await db.select({ filePath: schema.tasks.filePath }).from(schema.tasks);
  const seenPaths = new Set<string>();
  for (const t of dbTasks) {
    if (!seenPaths.has(t.filePath) && !fileSet.has(t.filePath)) {
      await db.delete(schema.tasks).where(eq(schema.tasks.filePath, t.filePath));
      seenPaths.add(t.filePath);
    }
  }

  // Re-index existing files
  for (const relPath of files) {
    await indexFile(db, vaultDir, relPath, now);
  }
}

/**
 * Reindex a single file. Use this when a file changes (via Chokidar).
 */
export async function reindexFile(
  db: Db,
  vaultDir: string,
  relPath: string
): Promise<void> {
  await indexFile(db, vaultDir, relPath, new Date());
}
