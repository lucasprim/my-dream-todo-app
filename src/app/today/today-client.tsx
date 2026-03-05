"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DbTask } from "@/db/schema";
import {
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
  quickCaptureToInboxAction,
} from "@/app/actions/task-actions";
import { updateDailyNoteContentAction } from "@/app/actions/daily-note-actions";

interface TodayClientProps {
  today: string;
  formattedDate: string;
  initialDueTasks: DbTask[];
  initialNoteContent: string;
}

export function TodayClient({
  today,
  formattedDate,
  initialDueTasks,
  initialNoteContent,
}: TodayClientProps) {
  const router = useRouter();
  const [noteContent, setNoteContent] = useState(initialNoteContent);
  const [noteSaving, setNoteSaving] = useState(false);

  const overdue = initialDueTasks.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = initialDueTasks.filter((t) => t.dueDate === today);

  const handleCapture = async (input: { title: string; dueDate?: string; recurrence?: string }) => {
    await quickCaptureToInboxAction(input);
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

  const handleSaveNote = async () => {
    setNoteSaving(true);
    await updateDailyNoteContentAction(today, noteContent);
    setNoteSaving(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-1">Today</h1>
      <p className="text-sm text-muted-foreground mb-6">{formattedDate}</p>

      <QuickCapture onCapture={handleCapture} placeholder="Capture to inbox…" />

      {overdue.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-destructive mb-2">
            Overdue ({overdue.length})
          </h2>
          <div className="space-y-1">
            {overdue.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {dueToday.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Due Today ({dueToday.length})
          </h2>
          <div className="space-y-1">
            {dueToday.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {overdue.length === 0 && dueToday.length === 0 && (
        <p className="text-sm text-muted-foreground mt-6 py-4 text-center">
          Nothing due today.
        </p>
      )}

      <Separator className="my-6" />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Daily Note
        </h2>
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
          placeholder="Write your notes for today…"
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveNote}
            disabled={noteSaving}
          >
            {noteSaving ? "Saving…" : "Save Note"}
          </Button>
        </div>
      </div>
    </div>
  );
}
