import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { parseMarkdownFile } from "@/lib/markdown/file-parser";
import { VAULT_DIRS } from "@/lib/vault-config";
import * as schema from "./schema";
import type { NewDbTask, NewProject, NewArea, NewDailyNote } from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugFromPath(filePath: string): string {
  return path.basename(filePath, ".md").toLowerCase().replace(/\s+/g, "-");
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
): "inbox" | "project" | "area" | "daily-note" | "other" {
  const dir = filePath.split("/")[0];
  if (dir === VAULT_DIRS.INBOX) return "inbox";
  if (dir === VAULT_DIRS.PROJECTS) return "project";
  if (dir === VAULT_DIRS.AREAS) return "area";
  if (dir === VAULT_DIRS.CALENDAR) return "daily-note";
  return "other";
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
  const kind = classifyFile(relPath);
  const fm = parsed.frontmatter;

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

  // Delete existing tasks for this file and re-insert
  await db.delete(schema.tasks).where(eq(schema.tasks.filePath, relPath));

  if (parsed.tasks.length > 0) {
    const newTasks: NewDbTask[] = parsed.tasks.map((t) => ({
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
    }));
    await db.insert(schema.tasks).values(newTasks);
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
