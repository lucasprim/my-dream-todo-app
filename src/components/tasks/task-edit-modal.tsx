"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MentionInput } from "@/components/tasks/mention-input";
import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import type { DbTask } from "@/db/schema";

interface TaskEditModalProps {
  task: DbTask;
  onClose: () => void;
  onSave: (patch: {
    title?: string;
    dueDate?: string | null;
    recurrence?: string | null;
  }) => Promise<void>;
}

export function TaskEditModal({ task, onClose, onSave }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [recurrence, setRecurrence] = useState<string | null>(
    task.recurrence ?? null
  );
  const [showRecurrence, setShowRecurrence] = useState(!!task.recurrence);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title !== task.title ? title : undefined,
        dueDate:
          dueDate !== (task.dueDate ?? "") ? dueDate || null : undefined,
        recurrence:
          recurrence !== (task.recurrence ?? null) ? recurrence : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <MentionInput
              id="title"
              value={title}
              onChange={setTitle}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Recurrence</Label>
              {!showRecurrence && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowRecurrence(true)}
                >
                  + Add
                </Button>
              )}
            </div>
            {showRecurrence && (
              <RecurrencePicker
                value={recurrence}
                dueDate={dueDate || null}
                onChange={(val) => {
                  setRecurrence(val);
                  if (val === null) setShowRecurrence(false);
                }}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
