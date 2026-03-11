"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskItem, renderTitleWithMentions } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Check,
  Plus,
  Minus,
  GripVertical,
  Search,
  ChevronDown,
  ChevronRight,
  Inbox,
  FolderOpen,
  Layers,
} from "lucide-react";
import type { DbTask, CalendarEvent } from "@/db/schema";
import type { AvailableTask } from "@/db/queries";
import { CalendarEventItem } from "@/components/calendar/calendar-event-item";
import { reorderTasksAction } from "@/app/actions/task-actions";

interface PlanningModeProps {
  scheduledTasks: DbTask[];
  carryForwardTasks: DbTask[];
  availableTasks: AvailableTask[];
  recurringDueTasks: AvailableTask[];
  calendarEvents: CalendarEvent[];
  onSchedule: (taskId: number) => Promise<void>;
  onUnschedule: (taskId: number) => Promise<void>;
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
  onFinishPlanning: () => void;
  onQuickCapture: (input: { title: string; dueDate?: string; recurrence?: string }) => Promise<void>;
  today: string;
  isPending: boolean;
  timezone: string;
}

type GroupedTasks = {
  inbox: AvailableTask[];
  projects: Map<string, AvailableTask[]>;
  areas: Map<string, AvailableTask[]>;
  other: AvailableTask[];
};

function groupAvailableTasks(tasks: AvailableTask[]): GroupedTasks {
  const result: GroupedTasks = {
    inbox: [],
    projects: new Map(),
    areas: new Map(),
    other: [],
  };

  for (const task of tasks) {
    switch (task.source) {
      case "inbox":
        result.inbox.push(task);
        break;
      case "project": {
        const name = task.projectTitle ?? "Unknown Project";
        const existing = result.projects.get(name) ?? [];
        existing.push(task);
        result.projects.set(name, existing);
        break;
      }
      case "area": {
        const name = task.areaTitle ?? "Unknown Area";
        const existing = result.areas.get(name) ?? [];
        existing.push(task);
        result.areas.set(name, existing);
        break;
      }
      default:
        result.other.push(task);
    }
  }

  return result;
}

function getRelativeDueLabel(dueDate: string, today: string): string {
  if (dueDate === today) return "due today";
  const due = new Date(dueDate + "T00:00:00");
  const todayDate = new Date(today + "T00:00:00");
  const diffDays = Math.round((todayDate.getTime() - due.getTime()) / 86400000);
  return diffDays === 1 ? "1 day overdue" : `${diffDays} days overdue`;
}

export function PlanningMode({
  scheduledTasks,
  carryForwardTasks,
  availableTasks,
  recurringDueTasks,
  calendarEvents,
  onSchedule,
  onUnschedule,
  onComplete,
  onDelete,
  onUpdate,
  onFinishPlanning,
  onQuickCapture,
  today,
  isPending,
  timezone,
}: PlanningModeProps) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isScheduling, startScheduling] = useTransition();

  const filteredAvailable = filter
    ? availableTasks.filter((t) =>
        t.title.toLowerCase().includes(filter.toLowerCase())
      )
    : availableTasks;

  const grouped = groupAvailableTasks(filteredAvailable);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSchedule = (taskId: number) => {
    startScheduling(async () => {
      await onSchedule(taskId);
    });
  };

  const handleUnschedule = (taskId: number) => {
    startScheduling(async () => {
      await onUnschedule(taskId);
    });
  };

  const handleAddAllCarryForward = () => {
    startScheduling(async () => {
      for (const task of carryForwardTasks) {
        await onSchedule(task.id);
      }
    });
  };

  const handleAddAllRecurring = () => {
    startScheduling(async () => {
      for (const task of recurringDueTasks) {
        await onSchedule(task.id);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Available Tasks Browser */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Available Tasks</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tasks…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* Inbox section */}
          {grouped.inbox.length > 0 && (
            <TaskSection
              icon={<Inbox className="h-4 w-4" />}
              label="Inbox"
              count={grouped.inbox.length}
              collapsed={collapsed.has("inbox")}
              onToggle={() => toggleCollapse("inbox")}
            >
              {grouped.inbox.map((task) => (
                <AvailableTaskRow
                  key={task.id}
                  task={task}
                  onSchedule={() => handleSchedule(task.id)}
                  disabled={isScheduling}
                />
              ))}
            </TaskSection>
          )}

          {/* Projects */}
          {[...grouped.projects.entries()].map(([name, tasks]) => (
            <TaskSection
              key={`project-${name}`}
              icon={<FolderOpen className="h-4 w-4" />}
              label={name}
              count={tasks.length}
              collapsed={collapsed.has(`project-${name}`)}
              onToggle={() => toggleCollapse(`project-${name}`)}
            >
              {tasks.map((task) => (
                <AvailableTaskRow
                  key={task.id}
                  task={task}
                  onSchedule={() => handleSchedule(task.id)}
                  disabled={isScheduling}
                />
              ))}
            </TaskSection>
          ))}

          {/* Areas */}
          {[...grouped.areas.entries()].map(([name, tasks]) => (
            <TaskSection
              key={`area-${name}`}
              icon={<Layers className="h-4 w-4" />}
              label={name}
              count={tasks.length}
              collapsed={collapsed.has(`area-${name}`)}
              onToggle={() => toggleCollapse(`area-${name}`)}
            >
              {tasks.map((task) => (
                <AvailableTaskRow
                  key={task.id}
                  task={task}
                  onSchedule={() => handleSchedule(task.id)}
                  disabled={isScheduling}
                />
              ))}
            </TaskSection>
          ))}

          {/* Other */}
          {grouped.other.length > 0 && (
            <TaskSection
              icon={<FolderOpen className="h-4 w-4" />}
              label="Other"
              count={grouped.other.length}
              collapsed={collapsed.has("other")}
              onToggle={() => toggleCollapse("other")}
            >
              {grouped.other.map((task) => (
                <AvailableTaskRow
                  key={task.id}
                  task={task}
                  onSchedule={() => handleSchedule(task.id)}
                  disabled={isScheduling}
                />
              ))}
            </TaskSection>
          )}

          {filteredAvailable.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {filter ? "No tasks match your filter." : "No available tasks."}
            </p>
          )}
        </div>
      </div>

      {/* Right: Today's Plan */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today&apos;s Plan</h2>
          <span className="text-sm text-muted-foreground">
            {scheduledTasks.length} task{scheduledTasks.length !== 1 ? "s" : ""}
            {calendarEvents.length > 0 && ` + ${calendarEvents.length} event${calendarEvents.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Calendar events */}
        {calendarEvents.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Calendar</h3>
            <div className="space-y-1 rounded-lg border p-2">
              {calendarEvents.map((event) => (
                <CalendarEventItem key={event.id} event={event} timezone={timezone} />
              ))}
            </div>
          </div>
        )}

        {/* Carry-forward banner */}
        {carryForwardTasks.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {carryForwardTasks.length} unfinished from previous days
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-700 dark:text-amber-300"
                onClick={handleAddAllCarryForward}
                disabled={isScheduling}
              >
                Add all to today
              </Button>
            </div>
            <div className="space-y-1">
              {carryForwardTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 text-sm py-1"
                >
                  <span className="truncate text-amber-900 dark:text-amber-100">
                    {renderTitleWithMentions(task.title)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleSchedule(task.id)}
                      disabled={isScheduling}
                      title="Add to today"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring tasks due today */}
        {recurringDueTasks.length > 0 && (
          <div className="rounded-lg border border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30 p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
                🔁 {recurringDueTasks.length} recurring task{recurringDueTasks.length !== 1 ? "s" : ""} due
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-teal-700 dark:text-teal-300"
                onClick={handleAddAllRecurring}
                disabled={isScheduling}
              >
                Add all to today
              </Button>
            </div>
            <div className="space-y-1">
              {recurringDueTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 text-sm py-1"
                >
                  <span className="truncate text-teal-900 dark:text-teal-100">
                    {renderTitleWithMentions(task.title)}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-teal-600 dark:text-teal-400">
                      {task.dueDate ? getRelativeDueLabel(task.dueDate, today) : "due today"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleSchedule(task.id)}
                      disabled={isScheduling}
                      title="Add to today"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled task list with drag-and-drop reordering */}
        {scheduledTasks.length > 0 ? (
          <PlanSortableList
            tasks={scheduledTasks}
            onComplete={onComplete}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onUnschedule={handleUnschedule}
            disableUnschedule={isScheduling}
          />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No tasks planned yet. Add tasks from the left panel.
          </p>
        )}

        <Separator className="my-4" />

        <QuickCapture onCapture={onQuickCapture} placeholder="Quick capture to inbox…" />

        <div className="mt-4">
          <Button
            onClick={onFinishPlanning}
            disabled={isPending}
            className="w-full"
          >
            <Check className="h-4 w-4 mr-2" />
            Done planning
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TaskSection({
  icon,
  label,
  count,
  collapsed,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        {icon}
        <span>{label}</span>
        <span className="text-xs ml-auto">{count}</span>
      </button>
      {!collapsed && <div className="ml-5 mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function PlanSortableList({
  tasks,
  onComplete,
  onDelete,
  onUpdate,
  onUnschedule,
  disableUnschedule,
}: {
  tasks: DbTask[];
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
  onUnschedule: (id: number) => void;
  disableUnschedule: boolean;
}) {
  const [items, setItems] = useState(tasks);

  if (tasks.length !== items.length || tasks.some((t, i) => t.id !== items[i]?.id)) {
    setItems(tasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    await reorderTasksAction(reordered.map((t) => t.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((task) => (
            <PlanSortableItem
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onUnschedule={() => onUnschedule(task.id)}
              disableUnschedule={disableUnschedule}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function PlanSortableItem({
  task,
  onComplete,
  onDelete,
  onUpdate,
  onUnschedule,
  disableUnschedule,
}: {
  task: DbTask;
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
  onUnschedule: () => void;
  disableUnschedule: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
        aria-label="Drag to reorder"
        suppressHydrationWarning
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <TaskItem
          task={task}
          onComplete={onComplete}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onUnschedule}
        disabled={disableUnschedule}
        title="Remove from plan"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AvailableTaskRow({
  task,
  onSchedule,
  disabled,
}: {
  task: AvailableTask;
  onSchedule: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2 group rounded px-2 py-1.5 hover:bg-accent/50 transition-colors">
      <span className="flex-1 text-sm truncate">{renderTitleWithMentions(task.title)}</span>
      {task.dueDate && (
        <span className="text-xs text-muted-foreground shrink-0">
          📅 {task.dueDate}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 invisible group-hover:visible"
        onClick={onSchedule}
        disabled={disabled}
        title="Add to today's plan"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
