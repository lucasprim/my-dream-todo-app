"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import type { DbTask, Area } from "@/db/schema";
import {
  createTaskAction,
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/task-actions";
import {
  updateAreaAction,
  deleteAreaAction,
} from "@/app/actions/project-area-actions";

interface AreaClientProps {
  area: Area;
  initialTasks: DbTask[];
}

export function AreaClient({ area, initialTasks }: AreaClientProps) {
  const router = useRouter();
  const tags = JSON.parse(area.tags) as string[];

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(area.title);
  const [saving, setSaving] = useState(false);

  const pending = initialTasks.filter((t) => t.completed === 0);
  const completed = initialTasks.filter((t) => t.completed === 1);

  const handleSaveEdit = async () => {
    setSaving(true);
    await updateAreaAction(area.slug, { title: editTitle });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete area "${area.title}" and all its tasks? This cannot be undone.`)) return;
    await deleteAreaAction(area.slug);
    router.push("/areas");
    router.refresh();
  };

  const handleCapture = async (input: { title: string; dueDate?: string; recurrence?: string }) => {
    await createTaskAction({ ...input, filePath: area.filePath });
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{area.title}</h1>
            {tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <QuickCapture onCapture={handleCapture} placeholder="Add task to area…" />

      <div className="mt-6 space-y-1">
        {pending.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onComplete={async (id) => { await completeTaskAction(id); router.refresh(); }}
            onDelete={async (id) => { await deleteTaskAction(id); router.refresh(); }}
            onUpdate={async (id, patch) => { await updateTaskAction(id, patch); router.refresh(); }}
          />
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No pending tasks.</p>
        )}
      </div>

      {completed.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Completed</h2>
          <div className="space-y-1">
            {completed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={async (id) => { await completeTaskAction(id); router.refresh(); }}
                onDelete={async (id) => { await deleteTaskAction(id); router.refresh(); }}
                onUpdate={async (id, patch) => { await updateTaskAction(id, patch); router.refresh(); }}
              />
            ))}
          </div>
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
