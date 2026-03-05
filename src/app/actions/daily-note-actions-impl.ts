import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { reindexFile } from "@/db/indexer";
import { getDailyNoteByDate } from "@/db/queries";
import * as schema from "@/db/schema";
import type { DailyNote } from "@/db/schema";
import { VAULT_DIRS } from "@/lib/vault-config";

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
  parsed.data[field] = value;
  return matter.stringify(parsed.content, parsed.data);
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
  const relPath = dailyNoteRelPath(date);
  const fullPath = path.join(vaultDir, relPath);
  const content = fs.readFileSync(fullPath, "utf8");
  const updated = setFrontmatterField(content, "planned", true);
  fs.writeFileSync(fullPath, updated, "utf8");
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
