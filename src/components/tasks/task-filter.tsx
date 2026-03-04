"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { DbTask } from "@/db/schema";

type StatusFilter = "all" | "pending" | "completed";
type PriorityFilter = "all" | "highest" | "high" | "medium" | "normal" | "low" | "lowest";

interface TaskFilterProps {
  tasks: DbTask[];
  children: (filtered: DbTask[]) => React.ReactNode;
}

export function TaskFilter({ tasks, children }: TaskFilterProps) {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Collect all tags from tasks
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const task of tasks) {
      const tags = JSON.parse(task.tags) as string[];
      for (const tag of tags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (status === "pending" && task.completed !== 0) return false;
      if (status === "completed" && task.completed !== 1) return false;
      if (priority !== "all" && task.priority !== priority) return false;
      if (selectedTag) {
        const tags = JSON.parse(task.tags) as string[];
        if (!tags.includes(selectedTag)) return false;
      }
      return true;
    });
  }, [tasks, status, priority, selectedTag]);

  const hasActiveFilters = status !== "pending" || priority !== "all" || selectedTag !== null;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Status filter */}
        <div className="flex rounded-md border overflow-hidden text-xs">
          {(["all", "pending", "completed"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={[
                "px-3 py-1.5 capitalize transition-colors",
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent/50",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as PriorityFilter)}
          className="rounded-md border px-2 py-1 text-xs bg-background"
        >
          <option value="all">All priorities</option>
          <option value="highest">Highest</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
          <option value="lowest">Lowest</option>
        </select>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "secondary"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Clear */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setStatus("pending");
              setPriority("all");
              setSelectedTag(null);
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {filtered.length} task{filtered.length !== 1 ? "s" : ""}
      </p>

      {children(filtered)}
    </div>
  );
}
