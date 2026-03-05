"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ListRestart, PartyPopper, Plus, Zap } from "lucide-react";
import type { ScheduledTask } from "@/db/queries";
import { scheduleTaskForDateAction } from "@/app/actions/task-actions";

interface FocusModeProps {
  tasks: ScheduledTask[];
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
  onReopenPlanning: () => void;
  onQuickCapture: (input: { title: string; dueDate?: string; recurrence?: string }) => Promise<void>;
  onSchedule: (taskId: number) => Promise<void>;
  today: string;
  isPending: boolean;
}

export function FocusMode({
  tasks,
  onComplete,
  onDelete,
  onUpdate,
  onReopenPlanning,
  onQuickCapture,
  onSchedule,
  today,
  isPending,
}: FocusModeProps) {
  const router = useRouter();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isCapturing, startCapture] = useTransition();

  const completedCount = tasks.filter((t) => t.completed === 1).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleQuickCaptureToToday = async (input: { title: string; dueDate?: string; recurrence?: string }) => {
    startCapture(async () => {
      await onQuickCapture(input);
      // After capturing to inbox, we need to schedule the new task for today
      // The router.refresh() in onQuickCapture will update the available tasks
      // But for Focus Mode quick capture, we want a streamlined flow
      router.refresh();
      setShowQuickAdd(false);
    });
  };

  return (
    <div className="max-w-2xl">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount} of {totalCount} done
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {progressPercent}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* All done state */}
      {allDone ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PartyPopper className="h-12 w-12 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">All done for today!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You completed all {totalCount} tasks. Great work!
          </p>
          <Button variant="outline" onClick={onReopenPlanning} disabled={isPending}>
            <ListRestart className="h-4 w-4 mr-2" />
            Re-plan day
          </Button>
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No tasks planned for today.
          </p>
          <Button variant="outline" onClick={onReopenPlanning} disabled={isPending}>
            <ListRestart className="h-4 w-4 mr-2" />
            Plan your day
          </Button>
        </div>
      ) : (
        <>
          {/* Task list */}
          <div className="space-y-1">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                sourceLabel={task.projectTitle ?? task.areaTitle ?? (task.source === "inbox" ? "Inbox" : undefined)}
                onComplete={onComplete}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </div>

          <Separator className="my-4" />

          {/* Quick add */}
          {showQuickAdd ? (
            <div className="mt-2">
              <QuickCapture
                onCapture={handleQuickCaptureToToday}
                placeholder="Add urgent task to today…"
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs text-muted-foreground"
                onClick={() => setShowQuickAdd(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowQuickAdd(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Quick add
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={onReopenPlanning}
                disabled={isPending}
              >
                <ListRestart className="h-4 w-4 mr-1" />
                Re-plan
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
