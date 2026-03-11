import matter from "gray-matter";
import { parseTaskLine } from "./task-line-parser";
import type { ParsedFile, Task } from "./schemas";

const H1_RE = /^#\s+(.+)$/m;

/**
 * Parse a markdown file's content (as a string) into a structured ParsedFile.
 * Uses gray-matter for frontmatter and the task-line parser for task extraction.
 *
 * @param content - Raw file content as string
 * @param filePath - Path relative to vault root, used to annotate tasks
 */
export function parseMarkdownFile(content: string, filePath: string): ParsedFile {
  const { data: frontmatter, content: body } = matter(content);

  // Extract H1 title from body
  const titleMatch = H1_RE.exec(body);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  // Walk each line, parse task lines
  const lines = body.split("\n");
  const tasks: Task[] = [];

  // Compute the number of lines consumed by the frontmatter block so we can
  // assign correct 1-based line numbers to tasks.
  // gray-matter strips "---\n...\n---\n" and the body starts immediately after.
  // Count lines in the stripped prefix to get the offset.
  const stripped = content.replace(/^---[\s\S]*?---\n?/, "");
  const prefixLength = content.length - stripped.length;
  const frontmatterLines = prefixLength > 0
    ? content.slice(0, prefixLength).split("\n").length - 1
    : 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parsed = parseTaskLine(line);
    if (parsed) {
      tasks.push({
        ...parsed,
        filePath,
        lineNumber: frontmatterLines + i + 1,
      });
    }
  }

  return {
    filePath,
    frontmatter: frontmatter as Record<string, unknown>,
    title,
    tasks,
    rawContent: content,
  };
}
