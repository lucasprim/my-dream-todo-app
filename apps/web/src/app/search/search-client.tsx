"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { TaskItem } from "@/components/tasks/task-item";
import { Search } from "lucide-react";
import type { DbTask } from "@/db/schema";
import {
  completeTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/app/actions/task-actions";

interface SearchClientProps {
  initialResults: DbTask[];
  initialQuery: string;
}

export function SearchClient({ initialResults, initialQuery }: SearchClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setQuery(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.push(`/search?${params.toString()}`);
    });
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search tasks…"
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="mt-6 space-y-1">
        {isPending ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Searching…
          </p>
        ) : initialResults.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              {initialResults.length} result{initialResults.length !== 1 ? "s" : ""}
            </p>
            {initialResults.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </>
        ) : query.trim() ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks found for &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Type to search tasks.
          </p>
        )}
      </div>
    </div>
  );
}
