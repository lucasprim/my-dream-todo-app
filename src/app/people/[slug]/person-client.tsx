"use client";

import { useRouter } from "next/navigation";
import { TaskItem } from "@/components/tasks/task-item";
import { Separator } from "@/components/ui/separator";
import { Users, Mail, Building2 } from "lucide-react";
import type { DbTask, Person } from "@/db/schema";
import {
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/task-actions";

interface PersonClientProps {
  person: Person;
  initialTasks: (DbTask & { projectTitle: string | null; areaTitle: string | null })[];
}

export function PersonClient({ person, initialTasks }: PersonClientProps) {
  const router = useRouter();

  const pending = initialTasks.filter((t) => t.completed === 0);
  const completed = initialTasks.filter((t) => t.completed === 1);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <Users className="h-6 w-6 text-muted-foreground mt-1" />
          <div>
            <h1 className="text-2xl font-bold">{person.name}</h1>
            <div className="flex flex-wrap gap-3 mt-1">
              {person.email && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {person.email}
                </span>
              )}
              {person.company && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {person.company}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-1">
        {pending.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onComplete={async (id) => { await completeTaskAction(id); router.refresh(); }}
            onDelete={async (id) => { await deleteTaskAction(id); router.refresh(); }}
            onUpdate={async (id, patch) => { await updateTaskAction(id, patch); router.refresh(); }}
          />
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No pending tasks.</p>
        )}
      </div>

      {completed.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Completed</h2>
          <div className="space-y-1">
            {completed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={async (id) => { await completeTaskAction(id); router.refresh(); }}
                onDelete={async (id) => { await deleteTaskAction(id); router.refresh(); }}
                onUpdate={async (id, patch) => { await updateTaskAction(id, patch); router.refresh(); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
