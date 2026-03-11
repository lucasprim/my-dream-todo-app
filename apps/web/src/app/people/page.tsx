import Link from "next/link";
import { getDb } from "@/lib/db-server";
import { listPeople } from "@/db/queries";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const db = getDb();
  const people = await listPeople(db);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">People</h1>

      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No people yet. Create a <code>.md</code> file in the{" "}
          <code>People/</code> directory of your vault, or mention someone
          with <code>[[@Name]]</code> in a task.
        </p>
      ) : (
        <div className="space-y-2">
          {people.map((person) => (
            <Link
              key={person.id}
              href={`/people/${person.slug}`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{person.name}</p>
                  {person.company && (
                    <p className="text-xs text-muted-foreground">
                      {person.company}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {person.taskCount} {person.taskCount === 1 ? "task" : "tasks"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
