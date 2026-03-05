"use client";

import { useState } from "react";
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
import { GripVertical } from "lucide-react";
import { TaskItem } from "./task-item";
import type { DbTask } from "@/db/schema";
import { reorderTasksAction } from "@/app/actions/task-actions";

interface SortableTaskItemProps {
  task: DbTask;
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
}

function SortableTaskItem({ task, onComplete, onDelete, onUpdate }: SortableTaskItemProps) {
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
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <TaskItem
          task={task}
          onComplete={onComplete}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}

interface SortableTaskListProps {
  tasks: DbTask[];
  onComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, patch: { title?: string; dueDate?: string | null; recurrence?: string | null }) => Promise<void>;
}

export function SortableTaskList({
  tasks,
  onComplete,
  onDelete,
  onUpdate,
}: SortableTaskListProps) {
  const [items, setItems] = useState(tasks);

  // Sync when parent tasks change (after server refresh)
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {items.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
