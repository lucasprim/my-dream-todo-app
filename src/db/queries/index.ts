import { eq, and, isNull, isNotNull, lte, gte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema";
import type { DbTask, Project, Area } from "../schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// ── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(db: Db): Promise<Project[]> {
  return db.select().from(schema.projects).orderBy(schema.projects.title);
}

export async function getProjectBySlug(db: Db, slug: string): Promise<Project | undefined> {
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .limit(1);
  return rows[0];
}

// ── Areas ─────────────────────────────────────────────────────────────────────

export async function listAreas(db: Db): Promise<Area[]> {
  return db.select().from(schema.areas).orderBy(schema.areas.title);
}

export async function getAreaBySlug(db: Db, slug: string): Promise<Area | undefined> {
  const rows = await db
    .select()
    .from(schema.areas)
    .where(eq(schema.areas.slug, slug))
    .limit(1);
  return rows[0];
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function getTasksByProject(db: Db, projectId: number): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectId, projectId))
    .orderBy(schema.tasks.lineNumber);
}

export async function getTasksByArea(db: Db, areaId: number): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.areaId, areaId))
    .orderBy(schema.tasks.lineNumber);
}

export async function getTasksByFile(db: Db, filePath: string): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.filePath, filePath))
    .orderBy(schema.tasks.lineNumber);
}

export async function getPendingTasks(db: Db): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.completed, 0))
    .orderBy(schema.tasks.dueDate, schema.tasks.priority);
}

export async function getCompletedTasks(db: Db): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.completed, 1))
    .orderBy(schema.tasks.doneDate);
}

export async function getTasksDueToday(db: Db, today: string): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.completed, 0),
        isNotNull(schema.tasks.dueDate),
        lte(schema.tasks.dueDate, today)
      )
    )
    .orderBy(schema.tasks.dueDate);
}

export async function getOverdueTasks(db: Db, today: string): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.completed, 0),
        isNotNull(schema.tasks.dueDate),
        lte(schema.tasks.dueDate, today)
      )
    )
    .orderBy(schema.tasks.dueDate);
}

export async function searchTasks(db: Db, query: string): Promise<DbTask[]> {
  return db
    .select()
    .from(schema.tasks)
    .where(like(schema.tasks.title, `%${query}%`))
    .orderBy(schema.tasks.dueDate);
}
