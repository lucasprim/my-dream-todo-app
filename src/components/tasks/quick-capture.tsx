"use client";

import { useState, useTransition } from "react";
import { MentionInput } from "@/components/tasks/mention-input";
import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, CalendarDays, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickCaptureInput {
  title: string;
  dueDate?: string;
  recurrence?: string;
}

interface QuickCaptureProps {
  onCapture: (input: QuickCaptureInput) => Promise<void>;
  placeholder?: string;
}

export function QuickCapture({
  onCapture,
  placeholder = "Add a task…",
}: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [showDueDate, setShowDueDate] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await onCapture({
        title: trimmed,
        dueDate: dueDate || undefined,
        recurrence: recurrence || undefined,
      });
      setValue("");
      setDueDate("");
      setRecurrence(null);
      setShowDueDate(false);
      setShowRecurrence(false);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <MentionInput
            value={value}
            onChange={setValue}
            placeholder={placeholder}
            disabled={isPending}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0",
            showDueDate || dueDate
              ? "text-primary"
              : "text-muted-foreground"
          )}
          onClick={() => setShowDueDate(!showDueDate)}
          title="Set due date"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0",
            showRecurrence || recurrence
              ? "text-primary"
              : "text-muted-foreground"
          )}
          onClick={() => setShowRecurrence(!showRecurrence)}
          title="Set recurrence"
        >
          <Repeat className="h-4 w-4" />
        </Button>
        <Button type="submit" size="icon" disabled={isPending || !value.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showDueDate && (
        <div className="flex items-center gap-2 pl-1">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-8 w-auto text-sm"
          />
          {dueDate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={() => setDueDate("")}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {showRecurrence && (
        <div className="rounded-md border p-3">
          <RecurrencePicker
            value={recurrence}
            dueDate={dueDate || null}
            onChange={setRecurrence}
          />
        </div>
      )}
    </form>
  );
}
