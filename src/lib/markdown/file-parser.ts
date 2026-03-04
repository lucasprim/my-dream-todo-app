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

  // gray-matter strips the frontmatter, so body starts at line 1 of the body.
  // We need to determine the original line numbers. The frontmatter block
  // occupies the top of the file: count lines in the frontmatter block.
  const frontmatterLineCount = content.length - content.replace(/^---[\s\S]*?---\n?/, "").length;
  const frontmatterLines = frontmatterLineCount > 0
    ? content.split("\n").findIndex((l, i, arr) => i > 0 && l.startsWith("---")) + 2
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
