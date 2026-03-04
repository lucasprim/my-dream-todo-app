import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { reindexFile } from "@/db/indexer";
import { getProjectBySlug, getAreaBySlug } from "@/db/queries";
import * as schema from "@/db/schema";
import { VAULT_DIRS } from "@/lib/vault-config";

type Db = ReturnType<typeof drizzle<typeof schema>>;

export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fullPath(vaultDir: string, relPath: string) {
  return path.join(vaultDir, relPath);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(
  db: Db,
  vaultDir: string,
  input: { title: string; status?: string; tags?: string[] }
): Promise<string> {
  const slug = titleToSlug(input.title);
  const relPath = `${VAULT_DIRS.PROJECTS}/${slug}.md`;
  const absPath = fullPath(vaultDir, relPath);

  if (fs.existsSync(absPath)) throw new Error(`Project "${slug}" already exists`);

  const content = matter.stringify(
    `\n# ${input.title}\n\n## Tasks\n\n`,
    {
      type: "project",
      title: input.title,
      status: input.status ?? "active",
      tags: input.tags ?? [],
    }
  );

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, "utf8");
  await reindexFile(db, vaultDir, relPath);
  return slug;
}

export async function updateProject(
  db: Db,
  vaultDir: string,
  slug: string,
  patch: { title?: string; status?: string; tags?: string[] }
): Promise<void> {
  const project = await getProjectBySlug(db, slug);
  if (!project) throw new Error(`Project not found: ${slug}`);

  const absPath = fullPath(vaultDir, project.filePath);
  const raw = fs.readFileSync(absPath, "utf8");
  const parsed = matter(raw);

  if (patch.title !== undefined) {
    parsed.data.title = patch.title;
    parsed.content = parsed.content.replace(/^# .+$/m, `# ${patch.title}`);
  }
  if (patch.status !== undefined) parsed.data.status = patch.status;
  if (patch.tags !== undefined) parsed.data.tags = patch.tags;

  fs.writeFileSync(absPath, matter.stringify(parsed.content, parsed.data), "utf8");
  await reindexFile(db, vaultDir, project.filePath);
}

export async function deleteProject(
  db: Db,
  vaultDir: string,
  slug: string
): Promise<void> {
  const project = await getProjectBySlug(db, slug);
  if (!project) throw new Error(`Project not found: ${slug}`);

  const absPath = fullPath(vaultDir, project.filePath);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

  await db.delete(schema.tasks).where(eq(schema.tasks.filePath, project.filePath));
  await db.delete(schema.projects).where(eq(schema.projects.id, project.id));
}

// ── Areas ─────────────────────────────────────────────────────────────────────

export async function createArea(
  db: Db,
  vaultDir: string,
  input: { title: string; tags?: string[] }
): Promise<string> {
  const slug = titleToSlug(input.title);
  const relPath = `${VAULT_DIRS.AREAS}/${slug}.md`;
  const absPath = fullPath(vaultDir, relPath);

  if (fs.existsSync(absPath)) throw new Error(`Area "${slug}" already exists`);

  const content = matter.stringify(
    `\n# ${input.title}\n\n## Tasks\n\n`,
    {
      type: "area",
      title: input.title,
      tags: input.tags ?? [],
    }
  );

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, "utf8");
  await reindexFile(db, vaultDir, relPath);
  return slug;
}

export async function updateArea(
  db: Db,
  vaultDir: string,
  slug: string,
  patch: { title?: string; tags?: string[] }
): Promise<void> {
  const area = await getAreaBySlug(db, slug);
  if (!area) throw new Error(`Area not found: ${slug}`);

  const absPath = fullPath(vaultDir, area.filePath);
  const raw = fs.readFileSync(absPath, "utf8");
  const parsed = matter(raw);

  if (patch.title !== undefined) {
    parsed.data.title = patch.title;
    parsed.content = parsed.content.replace(/^# .+$/m, `# ${patch.title}`);
  }
  if (patch.tags !== undefined) parsed.data.tags = patch.tags;

  fs.writeFileSync(absPath, matter.stringify(parsed.content, parsed.data), "utf8");
  await reindexFile(db, vaultDir, area.filePath);
}

export async function deleteArea(
  db: Db,
  vaultDir: string,
  slug: string
): Promise<void> {
  const area = await getAreaBySlug(db, slug);
  if (!area) throw new Error(`Area not found: ${slug}`);

  const absPath = fullPath(vaultDir, area.filePath);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

  await db.delete(schema.tasks).where(eq(schema.tasks.filePath, area.filePath));
  await db.delete(schema.areas).where(eq(schema.areas.id, area.id));
}
