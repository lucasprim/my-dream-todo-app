"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  FolderKanban,
  Layers,
  FileQuestion,
  ChevronRight,
  CalendarPlus,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbTask } from "@/db/schema";
import type { TaskGroup } from "./page";
import {
  quickCaptureToInboxAction,
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/task-actions";

interface InboxClientProps {
  groups: TaskGroup[];
  today: string;
}

const GROUP_ICONS = {
  inbox: Inbox,
  project: FolderKanban,
  area: Layers,
  other: FileQuestion,
} as const;

export function InboxClient({ groups, today }: InboxClientProps) {
  const router = useRouter();

  const totalPending = groups.reduce((sum, g) => sum + g.tasks.length, 0);

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

  const handleMoveToToday = async (id: number) => {
    await updateTaskAction(id, { dueDate: today });
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <span className="text-sm text-muted-foreground">
          {totalPending} pending task{totalPending !== 1 ? "s" : ""}
        </span>
      </div>

      <QuickCapture onCapture={handleCapture} placeholder="Add to inbox..." />

      <div className="mt-6 space-y-3">
        {groups.map((group) => (
          <TaskGroupSection
            key={group.key}
            group={group}
            today={today}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onMoveToToday={handleMoveToToday}
          />
        ))}

        {totalPending === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            All clear! No pending tasks.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Collapsible Group Section ────────────────────────────────────────────────

interface TaskGroupSectionProps {
  group: TaskGroup;
  today: string;
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null }) => Promise<void>;
  onMoveToToday: (id: number) => Promise<void>;
}

function TaskGroupSection({
  group,
  today,
  onComplete,
  onDelete,
  onUpdate,
  onMoveToToday,
}: TaskGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = GROUP_ICONS[group.icon];

  if (group.tasks.length === 0 && group.key !== "inbox") return null;

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-accent/50 rounded-t-lg transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            !collapsed && "rotate-90"
          )}
        />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm flex-1">{group.title}</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {group.tasks.length}
        </Badge>
        {group.href && (
          <Link
            href={group.href}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground ml-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </button>

      {/* Tasks */}
      {!collapsed && (
        <div className="border-t px-1 py-1">
          {group.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              No tasks
            </p>
          ) : (
            group.tasks.map((task) => (
              <div key={task.id} className="flex items-center">
                <div className="flex-1 min-w-0">
                  <TaskItem
                    task={task}
                    onComplete={onComplete}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                  />
                </div>
                {task.dueDate !== today && (
                  <MoveToTodayButton
                    taskId={task.id}
                    onMoveToToday={onMoveToToday}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Move to Today Button ─────────────────────────────────────────────────────

function MoveToTodayButton({
  taskId,
  onMoveToToday,
}: {
  taskId: number;
  onMoveToToday: (id: number) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 mr-2 shrink-0 text-muted-foreground hover:text-foreground"
      title="Move to Today"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await onMoveToToday(taskId);
        });
      }}
    >
      <CalendarPlus className={cn("h-3.5 w-3.5", isPending && "animate-pulse")} />
    </Button>
  );
}
