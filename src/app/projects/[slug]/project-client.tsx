"use client";

import { useRouter } from "next/navigation";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { DbTask, Project } from "@/db/schema";
import {
  createTaskAction,
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/task-actions";

interface ProjectClientProps {
  project: Project;
  initialTasks: DbTask[];
}

export function ProjectClient({ project, initialTasks }: ProjectClientProps) {
  const router = useRouter();
  const tags = JSON.parse(project.tags) as string[];

  const pending = initialTasks.filter((t) => t.completed === 0);
  const completed = initialTasks.filter((t) => t.completed === 1);

  const handleCapture = async (title: string) => {
    await createTaskAction({ title, filePath: project.filePath });
    router.refresh();
  };

  const handleComplete = async (id: number) => {
    await completeTaskAction(id);
    router.refresh();
  };

  const handleDelete = async (id: number) => {
    await deleteTaskAction(id);
    router.refresh();
  };

  const handleUpdate = async (
    id: number,
    patch: { title?: string; dueDate?: string | null }
  ) => {
    await updateTaskAction(id, patch);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project.title}</h1>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {project.status}
        </p>
      </div>

      <QuickCapture onCapture={handleCapture} placeholder="Add task to project…" />

      <div className="mt-6 space-y-1">
        {pending.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No pending tasks.
          </p>
        )}
      </div>

      {completed.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Completed
          </h2>
          <div className="space-y-1">
            {completed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
