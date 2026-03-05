import { eq, and, isNull, isNotNull, lte, gte, like, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema";
import type { DbTask, Project, Area, DailyNote, Person } from "../schema";

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

// ── People ───────────────────────────────────────────────────────────────────

export async function listPeople(
  db: Db
): Promise<(Person & { taskCount: number })[]> {
  const rows = await db
    .select({
      id: schema.people.id,
      slug: schema.people.slug,
      name: schema.people.name,
      filePath: schema.people.filePath,
      email: schema.people.email,
      company: schema.people.company,
      updatedAt: schema.people.updatedAt,
      taskCount: count(schema.taskPeople.taskId),
    })
    .from(schema.people)
    .leftJoin(schema.taskPeople, eq(schema.people.id, schema.taskPeople.personId))
    .groupBy(schema.people.id)
    .orderBy(schema.people.name);
  return rows;
}

export async function getPersonBySlug(
  db: Db,
  slug: string
): Promise<Person | undefined> {
  const rows = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.slug, slug))
    .limit(1);
  return rows[0];
}

export async function getTasksByPerson(
  db: Db,
  personId: number
): Promise<(DbTask & { projectTitle: string | null; areaTitle: string | null })[]> {
  const rows = await db
    .select({
      id: schema.tasks.id,
      taskId: schema.tasks.taskId,
      title: schema.tasks.title,
      completed: schema.tasks.completed,
      priority: schema.tasks.priority,
      dueDate: schema.tasks.dueDate,
      doneDate: schema.tasks.doneDate,
      scheduledDate: schema.tasks.scheduledDate,
      createdDate: schema.tasks.createdDate,
      startDate: schema.tasks.startDate,
      recurrence: schema.tasks.recurrence,
      tags: schema.tasks.tags,
      notes: schema.tasks.notes,
      filePath: schema.tasks.filePath,
      lineNumber: schema.tasks.lineNumber,
      projectId: schema.tasks.projectId,
      areaId: schema.tasks.areaId,
      updatedAt: schema.tasks.updatedAt,
      projectTitle: schema.projects.title,
      areaTitle: schema.areas.title,
    })
    .from(schema.taskPeople)
    .innerJoin(schema.tasks, eq(schema.taskPeople.taskId, schema.tasks.id))
    .leftJoin(schema.projects, eq(schema.tasks.projectId, schema.projects.id))
    .leftJoin(schema.areas, eq(schema.tasks.areaId, schema.areas.id))
    .where(eq(schema.taskPeople.personId, personId))
    .orderBy(schema.tasks.completed, schema.tasks.dueDate);
  return rows;
}

export async function searchPeople(
  db: Db,
  query: string
): Promise<Person[]> {
  return db
    .select()
    .from(schema.people)
    .where(like(schema.people.name, `%${query}%`))
    .orderBy(schema.people.name)
    .limit(10);
}

// ── Daily Notes ───────────────────────────────────────────────────────────────

export async function getDailyNoteByDate(db: Db, date: string): Promise<DailyNote | undefined> {
  const rows = await db
    .select()
    .from(schema.dailyNotes)
    .where(eq(schema.dailyNotes.date, date))
    .limit(1);
  return rows[0];
}

export async function listDailyNotes(db: Db): Promise<DailyNote[]> {
  return db
    .select()
    .from(schema.dailyNotes)
    .orderBy(desc(schema.dailyNotes.date));
}
