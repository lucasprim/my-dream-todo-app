import type { Task, Priority } from "./schemas";

const PRIORITY_EMOJI: Record<Priority, string> = {
  highest: "🔺",
  high: "⏫",
  medium: "🔼",
  normal: "",
  low: "🔽",
  lowest: "⬇️",
};

/**
 * Serialize a Task object back to an Obsidian Tasks-compatible task line.
 * Canonical field order: title, priority, recurrence, scheduled, start, created, due, done, taskId, dependsOn, tags
 */
export function serializeTaskLine(task: Task): string {
  const checkbox = task.completed ? "[x]" : "[ ]";
  const parts: string[] = [`- ${checkbox} ${task.title}`];

  const priority = task.priority ?? "normal";
  const priorityEmoji = PRIORITY_EMOJI[priority];
  if (priorityEmoji) parts.push(priorityEmoji);

  if (task.recurrence) parts.push(`🔁 ${task.recurrence}`);
  if (task.scheduledDate) parts.push(`⏳ ${task.scheduledDate}`);
  if (task.startDate) parts.push(`🛫 ${task.startDate}`);
  if (task.createdDate) parts.push(`➕ ${task.createdDate}`);
  if (task.dueDate) parts.push(`📅 ${task.dueDate}`);
  if (task.doneDate) parts.push(`✅ ${task.doneDate}`);
  if (task.taskId) parts.push(`🆔 ${task.taskId}`);

  const dependsOn = task.dependsOn ?? [];
  if (dependsOn.length > 0) parts.push(`⛔ ${dependsOn.join(",")}`);

  const tags = task.tags ?? [];
  if (tags.length > 0) parts.push(tags.map((t) => `#${t}`).join(" "));

  return parts.join(" ");
}
