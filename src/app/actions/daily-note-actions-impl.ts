import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { reindexFile } from "@/db/indexer";
import { getDailyNoteByDate, getTasksScheduledForDate } from "@/db/queries";
import * as schema from "@/db/schema";
import type { DailyNote, DbTask } from "@/db/schema";
import { VAULT_DIRS } from "@/lib/vault-config";
import { TASK_EMOJIS } from "@/lib/vault-config";

type Db = ReturnType<typeof drizzle<typeof schema>>;

function dailyNoteRelPath(date: string): string {
  return `${VAULT_DIRS.CALENDAR}/${date}.md`;
}

function dailyNoteTemplate(date: string): string {
  return `---\ntype: daily-note\ndate: ${date}\nplanned: false\n---\n\n# ${date}\n\n## Tasks\n\n## Notes\n\n`;
}

function setFrontmatterField(
  fileContent: string,
  field: string,
  value: unknown
): string {
  const parsed = matter(fileContent);
  // Use spread to avoid mutating gray-matter's cached data object
  const newData = { ...parsed.data, [field]: value };
  return matter.stringify(parsed.content, newData);
}

export async function createOrGetDailyNote(
  db: Db,
  vaultDir: string,
  date: string
): Promise<DailyNote> {
  const existing = await getDailyNoteByDate(db, date);
  if (existing) return existing;

  const relPath = dailyNoteRelPath(date);
  const fullPath = path.join(vaultDir, relPath);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, dailyNoteTemplate(date), "utf8");
  }

  await reindexFile(db, vaultDir, relPath);

  const note = await getDailyNoteByDate(db, date);
  if (!note) throw new Error(`Failed to create daily note for ${date}`);
  return note;
}

export async function updateDailyNoteContent(
  db: Db,
  vaultDir: string,
  date: string,
  content: string
): Promise<void> {
  const relPath = dailyNoteRelPath(date);
  const fullPath = path.join(vaultDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
  await reindexFile(db, vaultDir, relPath);
}

export async function finishPlanning(
  db: Db,
  vaultDir: string,
  date: string
): Promise<void> {
  await createOrGetDailyNote(db, vaultDir, date);

  // Sync tasks + set planned flag in one write
  const scheduled = await getTasksScheduledForDate(db, date);
  const relPath = dailyNoteRelPath(date);
  const fullPath = path.join(vaultDir, relPath);
  const content = fs.readFileSync(fullPath, "utf8");
  const taskLines = scheduled.map(formatTaskForDailyNote);
  const withTasks = replaceTasksSection(content, taskLines);
  const withPlanned = setFrontmatterField(withTasks, "planned", true);
  fs.writeFileSync(fullPath, withPlanned, "utf8");
  await reindexFile(db, vaultDir, relPath);
}

export async function reopenPlanning(
  db: Db,
  vaultDir: string,
  date: string
): Promise<void> {
  await createOrGetDailyNote(db, vaultDir, date);
  const relPath = dailyNoteRelPath(date);
  const fullPath = path.join(vaultDir, relPath);
  const content = fs.readFileSync(fullPath, "utf8");
  const updated = setFrontmatterField(content, "planned", false);
  fs.writeFileSync(fullPath, updated, "utf8");
  await reindexFile(db, vaultDir, relPath);
}

export function isPlanningComplete(dailyNoteContent: string): boolean {
  const parsed = matter(dailyNoteContent);
  return parsed.data.planned === true;
}

// ── Daily Note Task Sync ─────────────────────────────────────────────────────

function formatTaskForDailyNote(task: DbTask): string {
  const checkbox = task.completed === 1 ? "[x]" : "[ ]";
  let line = `- ${checkbox} ${task.title}`;
  if (task.completed === 1 && task.doneDate) {
    line += ` ${TASK_EMOJIS.DONE} ${task.doneDate}`;
  }
  if (task.dueDate) {
    line += ` ${TASK_EMOJIS.DUE} ${task.dueDate}`;
  }
  return line;
}

function replaceTasksSection(fileContent: string, taskLines: string[]): string {
  const parsed = matter(fileContent);
  const body = parsed.content;

  // Find ## Tasks section and replace its content up to the next ## heading
  const tasksHeadingRe = /^## Tasks\s*$/m;
  const match = tasksHeadingRe.exec(body);

  if (!match) {
    // No ## Tasks heading — append one
    const newBody = body.trimEnd() + "\n\n## Tasks\n\n" + taskLines.join("\n") + "\n";
    return matter.stringify(newBody, parsed.data);
  }

  const before = body.slice(0, match.index + match[0].length);
  const after = body.slice(match.index + match[0].length);

  // Find the next ## heading after ## Tasks
  const nextHeadingRe = /^## /m;
  const nextMatch = nextHeadingRe.exec(after.replace(/^\s*/, ""));
  const afterOffset = after.length - after.replace(/^\s*/, "").length;

  let rest: string;
  if (nextMatch) {
    rest = after.slice(afterOffset + nextMatch.index);
  } else {
    rest = "";
  }

  const newBody = before + "\n\n" + taskLines.join("\n") + "\n\n" + rest;
  return matter.stringify(newBody, parsed.data);
}

/**
 * Sync the daily note's ## Tasks section with the current scheduled tasks from the DB.
 * Call this after any schedule/unschedule/complete operation.
 */
export async function syncDailyNoteTasks(
  db: Db,
  vaultDir: string,
  date: string
): Promise<void> {
  await createOrGetDailyNote(db, vaultDir, date);

  const scheduled = await getTasksScheduledForDate(db, date);
  // Also include completed tasks that were scheduled for this date
  // (getTasksScheduledForDate only returns uncompleted)
  // For now, we just show the uncompleted ones — completed ones are already marked in the source files

  const relPath = dailyNoteRelPath(date);
  const fullPath = path.join(vaultDir, relPath);
  const content = fs.readFileSync(fullPath, "utf8");

  const taskLines = scheduled.map(formatTaskForDailyNote);
  const updated = replaceTasksSection(content, taskLines);

  fs.writeFileSync(fullPath, updated, "utf8");
  await reindexFile(db, vaultDir, relPath);
}
