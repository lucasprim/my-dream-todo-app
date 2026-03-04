"use client";

import { useRouter } from "next/navigation";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Separator } from "@/components/ui/separator";
import type { DbTask } from "@/db/schema";
import {
  quickCaptureToInboxAction,
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/task-actions";

interface InboxClientProps {
  initialTasks: DbTask[];
}

export function InboxClient({ initialTasks }: InboxClientProps) {
  const router = useRouter();

  const pending = initialTasks.filter((t) => t.completed === 0);
  const completed = initialTasks.filter((t) => t.completed === 1);

  const handleCapture = async (title: string) => {
    await quickCaptureToInboxAction({ title });
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
      <h1 className="text-2xl font-bold mb-6">Inbox</h1>

      <QuickCapture onCapture={handleCapture} placeholder="Add to inbox…" />

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
            Inbox zero! 🎉
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
