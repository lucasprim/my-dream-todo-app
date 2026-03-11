"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbTask } from "@/db/schema";
import { TaskEditModal } from "./task-edit-modal";
import { formatRecurrenceLabel } from "./recurrence-picker";

const MENTION_RE = /\[\[@([^\]]+)\]\]/g;

function nameToSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function renderTitleWithMentions(title: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_RE.source, "g");

  while ((match = regex.exec(title)) !== null) {
    if (match.index > lastIndex) {
      parts.push(title.slice(lastIndex, match.index));
    }
    const personName = match[1]!;
    const slug = nameToSlug(personName);
    parts.push(
      <Link
        key={match.index}
        href={`/people/${slug}`}
        className="text-primary underline underline-offset-2 hover:text-primary/80"
        onClick={(e) => e.stopPropagation()}
      >
        @{personName}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < title.length) {
    parts.push(title.slice(lastIndex));
  }

  return parts.length > 0 ? parts : title;
}

interface TaskItemProps {
  task: DbTask;
  sourceLabel?: string;
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
}

const PRIORITY_COLORS = {
  highest: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  normal: "",
  low: "bg-blue-200 text-blue-800",
  lowest: "bg-gray-200 text-gray-600",
} as const;

const PRIORITY_LABELS = {
  highest: "🔺",
  high: "⏫",
  medium: "🔼",
  normal: "",
  low: "🔽",
  lowest: "⬇️",
} as const;

export function TaskItem({ task, sourceLabel, onComplete, onDelete, onUpdate }: TaskItemProps) {
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);

  const isCompleted = task.completed === 1;

  const handleComplete = () => {
    startTransition(async () => {
      await onComplete(task.id);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await onDelete(task.id);
    });
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors",
          isPending && "opacity-50"
        )}
      >
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleComplete}
          disabled={isPending}
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.priority !== "normal" && (
              <span className="mr-1">{PRIORITY_LABELS[task.priority]}</span>
            )}
            {renderTitleWithMentions(task.title)}
          </p>

          {/* Metadata row */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {sourceLabel && (
              <span className="text-xs text-muted-foreground">{sourceLabel}</span>
            )}
            {task.dueDate && (
              <span className="text-xs text-muted-foreground">
                📅 {task.dueDate}
              </span>
            )}
            {task.recurrence && (
              <span className="text-xs text-muted-foreground">
                🔁 {formatRecurrenceLabel(task.recurrence)}
              </span>
            )}
            {task.tags && task.tags !== "[]" && (
              (JSON.parse(task.tags) as string[]).map((tag) => (
                <Badge key={tag} variant="secondary" className="h-4 px-1 text-xs">
                  #{tag}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowEdit(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showEdit && (
        <TaskEditModal
          task={task}
          onClose={() => setShowEdit(false)}
          onSave={async (patch) => {
            await onUpdate(task.id, patch);
            setShowEdit(false);
          }}
        />
      )}
    </>
  );
}
