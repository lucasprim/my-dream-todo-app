import { z } from "zod";

// ── Priority ────────────────────────────────────────────────────────────────

export const PrioritySchema = z.enum([
  "highest",
  "high",
  "medium",
  "normal",
  "low",
  "lowest",
]);
export type Priority = z.infer<typeof PrioritySchema>;

// ── Task ────────────────────────────────────────────────────────────────────

export const TaskSchema = z.object({
  /** Unique identifier (nanoid) */
  id: z.string().optional(),
  /** Raw task text without checkbox prefix */
  title: z.string(),
  /** Whether the checkbox is checked */
  completed: z.boolean().default(false),
  /** ISO date string (YYYY-MM-DD) from 📅 emoji */
  dueDate: z.string().optional(),
  /** ISO date string (YYYY-MM-DD) from ✅ emoji */
  doneDate: z.string().optional(),
  /** ISO date string (YYYY-MM-DD) from ⏳ emoji */
  scheduledDate: z.string().optional(),
  /** ISO date string (YYYY-MM-DD) from ➕ emoji */
  createdDate: z.string().optional(),
  /** ISO date string (YYYY-MM-DD) from 🛫 emoji */
  startDate: z.string().optional(),
  priority: PrioritySchema.default("normal"),
  /** Recurrence rule string following Obsidian Tasks format, e.g. "every day" */
  recurrence: z.string().optional(),
  /** Tags parsed from the task text (e.g. #tag) */
  tags: z.array(z.string()).default([]),
  /** Additional notes / description lines following the task line */
  notes: z.string().optional(),
  /** Source file path relative to vault root */
  filePath: z.string().optional(),
  /** 1-based line number in source file */
  lineNumber: z.number().int().positive().optional(),
  /** Task ID from 🆔 emoji */
  taskId: z.string().optional(),
  /** Dependency IDs from ⛔ emoji */
  dependsOn: z.array(z.string()).default([]),
});
export type Task = z.infer<typeof TaskSchema>;

// ── Project ─────────────────────────────────────────────────────────────────

export const ProjectSchema = z.object({
  /** Slug derived from filename */
  slug: z.string(),
  /** H1 title from the file */
  title: z.string(),
  status: z.enum(["active", "on-hold", "completed", "cancelled"]).default("active"),
  tags: z.array(z.string()).default([]),
  /** File path relative to vault root */
  filePath: z.string(),
  tasks: z.array(TaskSchema).default([]),
});
export type Project = z.infer<typeof ProjectSchema>;

// ── Area ────────────────────────────────────────────────────────────────────

export const AreaSchema = z.object({
  /** Slug derived from filename */
  slug: z.string(),
  /** H1 title from the file */
  title: z.string(),
  tags: z.array(z.string()).default([]),
  /** File path relative to vault root */
  filePath: z.string(),
  tasks: z.array(TaskSchema).default([]),
});
export type Area = z.infer<typeof AreaSchema>;

// ── Daily Note ───────────────────────────────────────────────────────────────

export const DailyNoteSchema = z.object({
  /** ISO date string (YYYY-MM-DD) */
  date: z.string(),
  /** File path relative to vault root */
  filePath: z.string(),
  tasks: z.array(TaskSchema).default([]),
  /** Raw notes content (non-task lines) */
  content: z.string().default(""),
});
export type DailyNote = z.infer<typeof DailyNoteSchema>;

// ── Parsed File ───────────────────────────────────────────────────────────────

export const ParsedFileSchema = z.object({
  filePath: z.string(),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
  title: z.string().optional(),
  tasks: z.array(TaskSchema).default([]),
  rawContent: z.string(),
});
export type ParsedFile = z.infer<typeof ParsedFileSchema>;
