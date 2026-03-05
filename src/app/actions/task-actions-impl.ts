import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import { serializeTaskLine } from "@/lib/markdown/task-line-serializer";
import { applyTaskUpdates, appendTask, removeTask, reorderTaskLines } from "@/lib/markdown/file-serializer";
import { reindexFile } from "@/db/indexer";
import * as schema from "@/db/schema";
import type { Priority } from "@/lib/markdown/schemas";
import type { Task } from "@/lib/markdown/schemas";
import { VAULT_FILES } from "@/lib/vault-config";
import { nextRecurrenceDate } from "@/lib/recurrence";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function vaultFilePath(vaultDir: string, relPath: string): string {
  return path.join(vaultDir, relPath);
}

function readFile(vaultDir: string, relPath: string): string {
  return fs.readFileSync(vaultFilePath(vaultDir, relPath), "utf8");
}

function writeFile(vaultDir: string, relPath: string, content: string): void {
  const fullPath = vaultFilePath(vaultDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function dbTaskToMarkdownTask(t: schema.DbTask): Task {
  return {
    id: String(t.id),
    title: t.title,
    completed: t.completed === 1,
    priority: (t.priority ?? "normal") as Priority,
    dueDate: t.dueDate ?? undefined,
    doneDate: t.doneDate ?? undefined,
    scheduledDate: t.scheduledDate ?? undefined,
    createdDate: t.createdDate ?? undefined,
    startDate: t.startDate ?? undefined,
    recurrence: t.recurrence ?? undefined,
    tags: t.tags ? (JSON.parse(t.tags) as string[]) : [],
    notes: t.notes ?? undefined,
    filePath: t.filePath,
    lineNumber: t.lineNumber ?? undefined,
    taskId: t.taskId ?? undefined,
    dependsOn: [],
    mentions: [],
  };
}

// ── Create Task ──────────────────────────────────────────────────────────────

export async function createTask(
  db: Db,
  vaultDir: string,
  input: {
    title: string;
    filePath: string;
    dueDate?: string;
    priority?: Priority;
    tags?: string[];
    recurrence?: string;
  }
): Promise<void> {
  const task: Task = {
    title: input.title,
    completed: false,
    priority: input.priority ?? "normal",
    dueDate: input.dueDate,
    tags: input.tags ?? [],
    recurrence: input.recurrence,
    dependsOn: [],
    mentions: [],
  };

  const rawContent = readFile(vaultDir, input.filePath);
  const updated = appendTask(rawContent, task);
  writeFile(vaultDir, input.filePath, updated);
  await reindexFile(db, vaultDir, input.filePath);
}

// ── Update Task ──────────────────────────────────────────────────────────────

export async function updateTask(
  db: Db,
  vaultDir: string,
  taskId: number,
  patch: Partial<{
    title: string;
    dueDate: string | null;
    priority: Priority;
    tags: string[];
    recurrence: string | null;
    scheduledDate: string | null;
    startDate: string | null;
    notes: string | null;
  }>
): Promise<void> {
  const [dbTask] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId))
    .limit(1);

  if (!dbTask) throw new Error(`Task not found: ${taskId}`);

  const currentTask = dbTaskToMarkdownTask(dbTask);
  const updatedTask: Task = {
    ...currentTask,
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.dueDate !== undefined && { dueDate: patch.dueDate ?? undefined }),
    ...(patch.priority !== undefined && { priority: patch.priority }),
    ...(patch.tags !== undefined && { tags: patch.tags }),
    ...(patch.recurrence !== undefined && { recurrence: patch.recurrence ?? undefined }),
    ...(patch.scheduledDate !== undefined && { scheduledDate: patch.scheduledDate ?? undefined }),
    ...(patch.startDate !== undefined && { startDate: patch.startDate ?? undefined }),
  };

  const lineNumber = dbTask.lineNumber;
  if (!lineNumber) throw new Error(`Task has no line number: ${taskId}`);

  const rawContent = readFile(vaultDir, dbTask.filePath);
  const updates = new Map([[lineNumber, updatedTask]]);
  const newContent = applyTaskUpdates(rawContent, updates);
  writeFile(vaultDir, dbTask.filePath, newContent);
  await reindexFile(db, vaultDir, dbTask.filePath);
}

// ── Complete Task ─────────────────────────────────────────────────────────────

export async function completeTask(
  db: Db,
  vaultDir: string,
  taskId: number
): Promise<void> {
  const [dbTask] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId))
    .limit(1);

  if (!dbTask) throw new Error(`Task not found: ${taskId}`);

  const currentTask = dbTaskToMarkdownTask(dbTask);
  const nowCompleting = !currentTask.completed;
  const updatedTask: Task = {
    ...currentTask,
    completed: nowCompleting,
    doneDate: nowCompleting ? new Date().toISOString().slice(0, 10) : undefined,
  };

  const lineNumber = dbTask.lineNumber;
  if (!lineNumber) throw new Error(`Task has no line number: ${taskId}`);

  const rawContent = readFile(vaultDir, dbTask.filePath);
  const updates = new Map([[lineNumber, updatedTask]]);
  let newContent = applyTaskUpdates(rawContent, updates);

  // Generate next occurrence for recurring tasks (only when completing)
  if (nowCompleting && currentTask.recurrence) {
    const baseDate = currentTask.dueDate ?? new Date().toISOString().slice(0, 10);
    const nextDue = nextRecurrenceDate(currentTask.recurrence, baseDate);
    if (nextDue) {
      const nextTask: Task = {
        ...currentTask,
        completed: false,
        dueDate: nextDue,
        doneDate: undefined,
        createdDate: new Date().toISOString().slice(0, 10),
      };
      newContent = appendTask(newContent, nextTask);
    }
  }

  writeFile(vaultDir, dbTask.filePath, newContent);
  await reindexFile(db, vaultDir, dbTask.filePath);
}

// ── Delete Task ──────────────────────────────────────────────────────────────

export async function deleteTask(
  db: Db,
  vaultDir: string,
  taskId: number
): Promise<void> {
  const [dbTask] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId))
    .limit(1);

  if (!dbTask) throw new Error(`Task not found: ${taskId}`);

  const lineNumber = dbTask.lineNumber;
  if (!lineNumber) throw new Error(`Task has no line number: ${taskId}`);

  const rawContent = readFile(vaultDir, dbTask.filePath);
  const newContent = removeTask(rawContent, lineNumber);
  writeFile(vaultDir, dbTask.filePath, newContent);

  // Delete from SQLite directly (don't reindex since we removed the task)
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
}

// ── Reorder Tasks ─────────────────────────────────────────────────────────────

/**
 * Reorder tasks within a file.
 * @param orderedTaskIds - task DB ids in the desired new order
 */
export async function reorderTasks(
  db: Db,
  vaultDir: string,
  orderedTaskIds: number[]
): Promise<void> {
  if (orderedTaskIds.length < 2) return;

  const dbTasks = await db
    .select()
    .from(schema.tasks)
    .where(
      // Fetch all by matching ids
      eq(schema.tasks.filePath,
        (await db.select({ fp: schema.tasks.filePath })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, orderedTaskIds[0]!))
          .limit(1)
        )[0]?.fp ?? ""
      )
    );

  const taskMap = new Map(dbTasks.map((t) => [t.id, t]));
  const orderedTasks = orderedTaskIds
    .map((id) => taskMap.get(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  if (orderedTasks.length === 0) return;
  const filePath = orderedTasks[0]!.filePath;

  const lineNumbers = orderedTasks
    .map((t) => t.lineNumber)
    .filter((n): n is number => n !== null && n !== undefined);

  if (lineNumbers.length !== orderedTasks.length) return;

  const rawContent = readFile(vaultDir, filePath);
  const newContent = reorderTaskLines(rawContent, lineNumbers);
  writeFile(vaultDir, filePath, newContent);
  await reindexFile(db, vaultDir, filePath);
}

// ── Quick Capture to Inbox ────────────────────────────────────────────────────

export async function quickCaptureToInbox(
  db: Db,
  vaultDir: string,
  input: { title: string; dueDate?: string; priority?: Priority; tags?: string[] }
): Promise<void> {
  const task: Task = {
    title: input.title,
    completed: false,
    priority: input.priority ?? "normal",
    dueDate: input.dueDate,
    tags: input.tags ?? [],
    dependsOn: [],
    mentions: [],
  };

  const inboxPath = VAULT_FILES.INBOX;
  const inboxFullPath = vaultFilePath(vaultDir, inboxPath);

  let rawContent: string;
  if (!fs.existsSync(inboxFullPath)) {
    rawContent = `---\ntype: inbox\n---\n\n# Inbox\n\n`;
    fs.mkdirSync(path.dirname(inboxFullPath), { recursive: true });
  } else {
    rawContent = readFile(vaultDir, inboxPath);
  }

  const updated = appendTask(rawContent, task);
  writeFile(vaultDir, inboxPath, updated);
  await reindexFile(db, vaultDir, inboxPath);
}
