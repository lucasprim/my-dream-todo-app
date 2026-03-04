import Link from "next/link";
import { getDb } from "@/lib/db-server";
import { listProjects } from "@/db/queries";
import { getTasksByProject } from "@/db/queries";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const db = getDb();
  const projects = await listProjects(db);

  // Get task counts per project
  const counts = await Promise.all(
    projects.map(async (p) => {
      const tasks = await getTasksByProject(db, p.id);
      const pending = tasks.filter((t) => t.completed === 0).length;
      return { id: p.id, pending, total: tasks.length };
    })
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Projects</h1>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects yet. Create a{" "}
          <code>.md</code> file in the <code>Projects/</code> directory of your vault.
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const count = countMap[project.id];
            const tags = JSON.parse(project.tags) as string[];
            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{project.title}</p>
                    {tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {count?.pending ?? 0} pending
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
