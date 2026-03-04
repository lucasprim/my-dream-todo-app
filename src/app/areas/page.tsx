import Link from "next/link";
import { getDb } from "@/lib/db-server";
import { listAreas, getTasksByArea } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const db = getDb();
  const areas = await listAreas(db);

  const counts = await Promise.all(
    areas.map(async (a) => {
      const tasks = await getTasksByArea(db, a.id);
      const pending = tasks.filter((t) => t.completed === 0).length;
      return { id: a.id, pending, total: tasks.length };
    })
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Areas</h1>

      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No areas yet. Create a{" "}
          <code>.md</code> file in the <code>Areas/</code> directory of your vault.
        </p>
      ) : (
        <div className="space-y-2">
          {areas.map((area) => {
            const count = countMap[area.id];
            const tags = JSON.parse(area.tags) as string[];
            return (
              <Link
                key={area.id}
                href={`/areas/${area.slug}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{area.title}</p>
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
