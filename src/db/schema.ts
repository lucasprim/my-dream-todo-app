import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

// ── Projects ─────────────────────────────────────────────────────────────────

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    status: text("status", {
      enum: ["active", "on-hold", "completed", "cancelled"],
    })
      .notNull()
      .default("active"),
    filePath: text("file_path").notNull().unique(),
    tags: text("tags").notNull().default("[]"), // JSON array
    updatedAt: text("updated_at").notNull(), // ISO string
  },
  (t) => [index("projects_status_idx").on(t.status)]
);

// ── Areas ─────────────────────────────────────────────────────────────────────

export const areas = sqliteTable("areas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  filePath: text("file_path").notNull().unique(),
  tags: text("tags").notNull().default("[]"), // JSON array
  updatedAt: text("updated_at").notNull(), // ISO string
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** nanoid or task ID from 🆔 emoji */
    taskId: text("task_id"),
    title: text("title").notNull(),
    /** 0 = false, 1 = true */
    completed: integer("completed").notNull().default(0),
    priority: text("priority", {
      enum: ["highest", "high", "medium", "normal", "low", "lowest"],
    })
      .notNull()
      .default("normal"),
    dueDate: text("due_date"),
    doneDate: text("done_date"),
    scheduledDate: text("scheduled_date"),
    createdDate: text("created_date"),
    startDate: text("start_date"),
    recurrence: text("recurrence"),
    tags: text("tags").notNull().default("[]"), // JSON array
    notes: text("notes"),
    filePath: text("file_path").notNull(),
    lineNumber: integer("line_number"),
    /** FK to projects.id (nullable) */
    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    /** FK to areas.id (nullable) */
    areaId: integer("area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
    updatedAt: text("updated_at").notNull(), // ISO string
  },
  (t) => [
    index("tasks_file_path_idx").on(t.filePath),
    index("tasks_due_date_idx").on(t.dueDate),
    index("tasks_completed_idx").on(t.completed),
    index("tasks_project_id_idx").on(t.projectId),
    index("tasks_area_id_idx").on(t.areaId),
    index("tasks_scheduled_date_idx").on(t.scheduledDate),
  ]
);

// ── People ───────────────────────────────────────────────────────────────────

export const people = sqliteTable(
  "people",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** File path in People/ folder (null if auto-created from mention) */
    filePath: text("file_path"),
    email: text("email"),
    company: text("company"),
    updatedAt: text("updated_at").notNull(), // ISO string
  },
  (t) => [index("people_slug_idx").on(t.slug)]
);

// ── Task–People (join table) ─────────────────────────────────────────────────

export const taskPeople = sqliteTable(
  "task_people",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("task_people_task_idx").on(t.taskId),
    index("task_people_person_idx").on(t.personId),
  ]
);

// ── Daily Notes ───────────────────────────────────────────────────────────────

export const dailyNotes = sqliteTable(
  "daily_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull().unique(), // YYYY-MM-DD
    filePath: text("file_path").notNull().unique(),
    content: text("content").notNull().default(""),
    updatedAt: text("updated_at").notNull(), // ISO string
  },
  (t) => [index("daily_notes_date_idx").on(t.date)]
);

// ── Types ────────────────────────────────────────────────────────────────────

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Area = typeof areas.$inferSelect;
export type NewArea = typeof areas.$inferInsert;
export type DbTask = typeof tasks.$inferSelect;
export type NewDbTask = typeof tasks.$inferInsert;
export type DailyNote = typeof dailyNotes.$inferSelect;
export type NewDailyNote = typeof dailyNotes.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type TaskPerson = typeof taskPeople.$inferSelect;
export type NewTaskPerson = typeof taskPeople.$inferInsert;
