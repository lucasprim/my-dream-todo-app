"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DbTask } from "@/db/schema";
import type { AvailableTask, ScheduledTask } from "@/db/queries";
import {
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
  scheduleTaskForDateAction,
  unscheduleTaskAction,
  quickCaptureToInboxAction,
} from "@/app/actions/task-actions";
import {
  finishPlanningAction,
  reopenPlanningAction,
} from "@/app/actions/daily-note-actions";
import { FocusMode } from "./focus-mode";
import { PlanningMode } from "./planning-mode";

interface TodayClientProps {
  today: string;
  formattedDate: string;
  planned: boolean;
  scheduledTasks: ScheduledTask[];
  carryForwardTasks: DbTask[];
  availableTasks: AvailableTask[];
}

export function TodayClient({
  today,
  formattedDate,
  planned,
  scheduledTasks,
  carryForwardTasks,
  availableTasks,
}: TodayClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
    patch: { title?: string; dueDate?: string | null; recurrence?: string | null }
  ) => {
    await updateTaskAction(id, patch);
    router.refresh();
  };

  const handleSchedule = async (taskId: number) => {
    await scheduleTaskForDateAction(taskId, today);
    router.refresh();
  };

  const handleUnschedule = async (taskId: number) => {
    await unscheduleTaskAction(taskId);
    router.refresh();
  };

  const handleQuickCapture = async (input: { title: string; dueDate?: string; recurrence?: string }) => {
    // Quick capture to inbox, then schedule for today
    const taskId = await quickCaptureToInboxAction(input);
    await scheduleTaskForDateAction(taskId, today);
    router.refresh();
  };

  const handleFinishPlanning = () => {
    startTransition(async () => {
      await finishPlanningAction(today);
      router.refresh();
    });
  };

  const handleReopenPlanning = () => {
    startTransition(async () => {
      await reopenPlanningAction(today);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
      </div>

      {planned ? (
        <FocusMode
          tasks={scheduledTasks}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onReopenPlanning={handleReopenPlanning}
          onQuickCapture={handleQuickCapture}
          onSchedule={handleSchedule}
          today={today}
          isPending={isPending}
        />
      ) : (
        <PlanningMode
          scheduledTasks={scheduledTasks}
          carryForwardTasks={carryForwardTasks}
          availableTasks={availableTasks}
          onSchedule={handleSchedule}
          onUnschedule={handleUnschedule}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onFinishPlanning={handleFinishPlanning}
          onQuickCapture={handleQuickCapture}
          today={today}
          isPending={isPending}
        />
      )}
    </div>
  );
}
