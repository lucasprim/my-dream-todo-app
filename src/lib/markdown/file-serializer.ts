import matter from "gray-matter";
import { serializeTaskLine } from "./task-line-serializer";
import { isTaskLine } from "./task-line-parser";
import type { Task } from "./schemas";

/**
 * Apply task updates to a raw markdown file content.
 * Replaces task lines at specified line numbers with the serialized form of the updated task.
 *
 * @param rawContent - Original file content
 * @param updates - Map of 1-based line number → updated Task
 * @returns New file content with tasks replaced
 */
export function applyTaskUpdates(
  rawContent: string,
  updates: Map<number, Task>
): string {
  const lines = rawContent.split("\n");
  for (const [lineNumber, task] of updates) {
    const idx = lineNumber - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const original = lines[idx];
    if (!original || !isTaskLine(original)) continue;
    // Preserve leading whitespace from original line
    const indent = original.match(/^(\s*)/)?.[1] ?? "";
    const serialized = serializeTaskLine(task);
    // If there was indentation on the original line, re-apply it
    lines[idx] = indent ? serialized.replace(/^([-*])/, `${indent}$1`) : serialized;
  }
  return lines.join("\n");
}

/**
 * Append a new task line to a file section or to the end of the body.
 * If sectionHeading is provided, appends after the last task in that section.
 * Otherwise appends at the end of the file.
 *
 * @param rawContent - Original file content
 * @param task - Task to append
 * @param sectionHeading - Optional heading to append under (e.g. "## Tasks")
 */
export function appendTask(
  rawContent: string,
  task: Task,
  sectionHeading?: string
): string {
  const taskLine = serializeTaskLine(task);
  const lines = rawContent.split("\n");

  if (sectionHeading) {
    // Find the heading and insert after the last task line in that section
    const headingIdx = lines.findIndex((l) => l.trim() === sectionHeading.trim());
    if (headingIdx !== -1) {
      // Find end of section (next heading or EOF)
      let insertIdx = headingIdx + 1;
      for (let i = headingIdx + 1; i < lines.length; i++) {
        if (lines[i]?.match(/^#{1,6}\s/)) break;
        if (isTaskLine(lines[i] ?? "")) insertIdx = i + 1;
        else if (lines[i]?.trim() === "" && insertIdx > headingIdx) {
          // Allow blank line after last task
          insertIdx = i;
          break;
        }
      }
      lines.splice(insertIdx, 0, taskLine);
      return lines.join("\n");
    }
  }

  // Default: append at end of file
  const trimmed = rawContent.trimEnd();
  return `${trimmed}\n${taskLine}\n`;
}

/**
 * Remove a task line at the given 1-based line number.
 */
export function removeTask(rawContent: string, lineNumber: number): string {
  const lines = rawContent.split("\n");
  const idx = lineNumber - 1;
  if (idx >= 0 && idx < lines.length && isTaskLine(lines[idx] ?? "")) {
    lines.splice(idx, 1);
  }
  return lines.join("\n");
}

/**
 * Reorder task lines within a file.
 * orderedLineNumbers is the desired order of the task line numbers.
 * Tasks are placed back at the positions they originally occupied,
 * in the new order.
 *
 * @param rawContent - Original file content
 * @param orderedLineNumbers - Task line numbers in desired order (1-based)
 */
export function reorderTaskLines(
  rawContent: string,
  orderedLineNumbers: number[]
): string {
  const lines = rawContent.split("\n");
  const sorted = [...orderedLineNumbers].sort((a, b) => a - b);

  // Extract content for each line in the old order (sorted positions)
  const originalContents = sorted.map((ln) => lines[ln - 1] ?? "");

  // Map desired order → position slot
  // orderedLineNumbers[i] is the task that should go into slot i
  // We place orderedLineNumbers[i]'s content at sorted[i]'s position
  orderedLineNumbers.forEach((originalLn, newSlot) => {
    const targetPosition = sorted[newSlot]! - 1;
    const content = originalContents[
      sorted.indexOf(originalLn)
    ]!;
    lines[targetPosition] = content;
  });

  return lines.join("\n");
}

/**
 * Stringify frontmatter + body back to markdown.
 * Useful when frontmatter values need to be updated (e.g. status).
 */
export function serializeMarkdownFile(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  if (Object.keys(frontmatter).length === 0) return body;
  return matter.stringify(body, frontmatter);
}
