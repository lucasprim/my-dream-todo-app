import { describe, it, expect } from "vitest";
import { parseMarkdownFile } from "../file-parser";

describe("parseMarkdownFile", () => {
  describe("frontmatter parsing", () => {
    it("parses YAML frontmatter", () => {
      const content = `---
type: project
status: active
tags: [development, personal]
---

# My Project
`;
      const result = parseMarkdownFile(content, "Projects/my-project.md");
      expect(result.frontmatter).toEqual({
        type: "project",
        status: "active",
        tags: ["development", "personal"],
      });
    });

    it("handles files without frontmatter", () => {
      const content = `# Simple File

- [ ] A task
`;
      const result = parseMarkdownFile(content, "Inbox/inbox.md");
      expect(result.frontmatter).toEqual({});
    });
  });

  describe("title parsing", () => {
    it("extracts the H1 title", () => {
      const content = `---
type: project
---

# My Project Title

Some content here.
`;
      const result = parseMarkdownFile(content, "Projects/test.md");
      expect(result.title).toBe("My Project Title");
    });

    it("returns undefined when no H1 exists", () => {
      const content = `Just content without a heading.\n`;
      const result = parseMarkdownFile(content, "test.md");
      expect(result.title).toBeUndefined();
    });
  });

  describe("task parsing", () => {
    it("parses multiple tasks from file body", () => {
      const content = `---
type: inbox
---

# Inbox

- [ ] Buy groceries 📅 2026-03-05
- [x] Call dentist ✅ 2026-03-01
- [ ] Review documents ⏫
`;
      const result = parseMarkdownFile(content, "Inbox/inbox.md");
      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0]?.title).toBe("Buy groceries");
      expect(result.tasks[0]?.dueDate).toBe("2026-03-05");
      expect(result.tasks[0]?.completed).toBe(false);
      expect(result.tasks[1]?.completed).toBe(true);
      expect(result.tasks[1]?.doneDate).toBe("2026-03-01");
      expect(result.tasks[2]?.priority).toBe("high");
    });

    it("assigns filePath to each task", () => {
      const content = `- [ ] Task one\n- [ ] Task two\n`;
      const result = parseMarkdownFile(content, "Inbox/inbox.md");
      expect(result.tasks[0]?.filePath).toBe("Inbox/inbox.md");
      expect(result.tasks[1]?.filePath).toBe("Inbox/inbox.md");
    });

    it("assigns line numbers to tasks", () => {
      const content = `# Title\n\n- [ ] First task\n- [ ] Second task\n`;
      const result = parseMarkdownFile(content, "test.md");
      expect(result.tasks[0]?.lineNumber).toBe(3);
      expect(result.tasks[1]?.lineNumber).toBe(4);
    });

    it("handles files with no tasks", () => {
      const content = `# Empty Project\n\nJust some notes here.\n`;
      const result = parseMarkdownFile(content, "Projects/empty.md");
      expect(result.tasks).toHaveLength(0);
    });

    it("parses tasks interspersed with prose", () => {
      const content = `# Project

Some description here.

## Tasks

- [ ] First task
- [ ] Second task

## Notes

More text here.

- [ ] Third task
`;
      const result = parseMarkdownFile(content, "Projects/test.md");
      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[2]?.title).toBe("Third task");
    });
  });

  describe("file path handling", () => {
    it("sets filePath on the parsed file result", () => {
      const result = parseMarkdownFile("- [ ] Task\n", "Projects/my-project.md");
      expect(result.filePath).toBe("Projects/my-project.md");
    });
  });

  describe("rawContent preservation", () => {
    it("preserves the original raw content", () => {
      const content = `---\ntype: test\n---\n\n# Title\n\n- [ ] Task\n`;
      const result = parseMarkdownFile(content, "test.md");
      expect(result.rawContent).toBe(content);
    });
  });
});
