"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { TaskItem } from "@/components/tasks/task-item";
import { Separator } from "@/components/ui/separator";
import { Users, Mail, Building2, Inbox, FolderOpen, Layers } from "lucide-react";
import type { DbTask, Person } from "@/db/schema";
import {
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/task-actions";

type TaskWithContext = DbTask & { projectTitle: string | null; areaTitle: string | null };

interface PersonClientProps {
  person: Person;
  initialTasks: TaskWithContext[];
}

function taskContext(task: TaskWithContext): { label: string; href: string; icon: React.ElementType } {
  if (task.projectTitle) {
    const slug = task.filePath.split("/")[1]?.replace(".md", "") ?? "";
    return { label: task.projectTitle, href: `/projects/${slug}`, icon: FolderOpen };
  }
  if (task.areaTitle) {
    const slug = task.filePath.split("/")[1]?.replace(".md", "") ?? "";
    return { label: task.areaTitle, href: `/areas/${slug}`, icon: Layers };
  }
  return { label: "Inbox", href: "/inbox", icon: Inbox };
}

function TaskWithSource({ task, actions }: {
  task: TaskWithContext;
  actions: {
    onComplete: (id: number) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
  };
}) {
  const ctx = taskContext(task);
  const Icon = ctx.icon;
  return (
    <div>
      <Link
        href={ctx.href}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-9 mb-0.5"
      >
        <Icon className="h-3 w-3" />
        {ctx.label}
      </Link>
      <TaskItem task={task} {...actions} />
    </div>
  );
}

export function PersonClient({ person, initialTasks }: PersonClientProps) {
  const router = useRouter();

  const pending = initialTasks.filter((t) => t.completed === 0);
  const completed = initialTasks.filter((t) => t.completed === 1);

  const actions = {
    onComplete: async (id: number) => { await completeTaskAction(id); router.refresh(); },
    onDelete: async (id: number) => { await deleteTaskAction(id); router.refresh(); },
    onUpdate: async (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => { await updateTaskAction(id, patch); router.refresh(); },
  };

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

      <div className="mt-6 space-y-3">
        {pending.map((task) => (
          <TaskWithSource key={task.id} task={task} actions={actions} />
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No pending tasks.</p>
        )}
      </div>

      {completed.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Completed</h2>
          <div className="space-y-3">
            {completed.map((task) => (
              <TaskWithSource key={task.id} task={task} actions={actions} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
