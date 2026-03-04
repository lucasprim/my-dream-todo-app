import { describe, it, expect } from "vitest";
import { parseTaskLine } from "../task-line-parser";

describe("parseTaskLine", () => {
  describe("basic checkbox parsing", () => {
    it("parses an incomplete task", () => {
      const result = parseTaskLine("- [ ] Buy groceries");
      expect(result).not.toBeNull();
      expect(result?.completed).toBe(false);
      expect(result?.title).toBe("Buy groceries");
    });

    it("parses a completed task", () => {
      const result = parseTaskLine("- [x] Buy groceries");
      expect(result).not.toBeNull();
      expect(result?.completed).toBe(true);
      expect(result?.title).toBe("Buy groceries");
    });

    it("parses a completed task with uppercase X", () => {
      const result = parseTaskLine("- [X] Buy groceries");
      expect(result?.completed).toBe(true);
    });

    it("returns null for non-task lines", () => {
      expect(parseTaskLine("Just a regular line")).toBeNull();
      expect(parseTaskLine("# Heading")).toBeNull();
      expect(parseTaskLine("- A list item without checkbox")).toBeNull();
      expect(parseTaskLine("")).toBeNull();
    });

    it("parses indented tasks", () => {
      const result = parseTaskLine("  - [ ] Indented task");
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Indented task");
    });
  });

  describe("due date parsing (📅)", () => {
    it("parses a due date", () => {
      const result = parseTaskLine("- [ ] Buy groceries 📅 2026-03-05");
      expect(result?.dueDate).toBe("2026-03-05");
      expect(result?.title).toBe("Buy groceries");
    });

    it("strips the due date from the title", () => {
      const result = parseTaskLine("- [ ] Task with date 📅 2026-01-15");
      expect(result?.title).not.toContain("📅");
      expect(result?.title).not.toContain("2026-01-15");
    });
  });

  describe("done date parsing (✅)", () => {
    it("parses a done date", () => {
      const result = parseTaskLine("- [x] Completed task ✅ 2026-03-04");
      expect(result?.doneDate).toBe("2026-03-04");
    });

    it("strips the done date from the title", () => {
      const result = parseTaskLine("- [x] Task ✅ 2026-03-04");
      expect(result?.title).not.toContain("✅");
      expect(result?.title).not.toContain("2026-03-04");
    });
  });

  describe("scheduled date parsing (⏳)", () => {
    it("parses a scheduled date", () => {
      const result = parseTaskLine("- [ ] Task ⏳ 2026-03-10");
      expect(result?.scheduledDate).toBe("2026-03-10");
    });
  });

  describe("created date parsing (➕)", () => {
    it("parses a created date", () => {
      const result = parseTaskLine("- [ ] Task ➕ 2026-03-01");
      expect(result?.createdDate).toBe("2026-03-01");
    });
  });

  describe("start date parsing (🛫)", () => {
    it("parses a start date", () => {
      const result = parseTaskLine("- [ ] Task 🛫 2026-03-08");
      expect(result?.startDate).toBe("2026-03-08");
    });
  });

  describe("priority parsing", () => {
    it("parses highest priority (🔺)", () => {
      const result = parseTaskLine("- [ ] Urgent task 🔺");
      expect(result?.priority).toBe("highest");
    });

    it("parses high priority (⏫)", () => {
      const result = parseTaskLine("- [ ] Important task ⏫");
      expect(result?.priority).toBe("high");
    });

    it("parses medium priority (🔼)", () => {
      const result = parseTaskLine("- [ ] Medium task 🔼");
      expect(result?.priority).toBe("medium");
    });

    it("parses low priority (🔽)", () => {
      const result = parseTaskLine("- [ ] Low task 🔽");
      expect(result?.priority).toBe("low");
    });

    it("parses lowest priority (⬇️)", () => {
      const result = parseTaskLine("- [ ] Lowest task ⬇️");
      expect(result?.priority).toBe("lowest");
    });

    it("defaults to normal priority when no emoji is present", () => {
      const result = parseTaskLine("- [ ] Normal task");
      expect(result?.priority).toBe("normal");
    });

    it("strips priority emoji from title", () => {
      const result = parseTaskLine("- [ ] Buy groceries ⏫");
      expect(result?.title).toBe("Buy groceries");
      expect(result?.title).not.toContain("⏫");
    });
  });

  describe("recurring task parsing (🔁)", () => {
    it("parses a recurring rule", () => {
      const result = parseTaskLine("- [ ] Morning workout 🔁 every day");
      expect(result?.recurrence).toBe("every day");
    });

    it("parses multi-word recurring rules", () => {
      const result = parseTaskLine("- [ ] Review budget 🔁 every month");
      expect(result?.recurrence).toBe("every month");
    });

    it("strips recurrence from title", () => {
      const result = parseTaskLine("- [ ] Daily standup 🔁 every day");
      expect(result?.title).toBe("Daily standup");
      expect(result?.title).not.toContain("🔁");
    });
  });

  describe("tag parsing", () => {
    it("parses inline tags", () => {
      const result = parseTaskLine("- [ ] Buy groceries #shopping #personal");
      expect(result?.tags).toContain("shopping");
      expect(result?.tags).toContain("personal");
    });

    it("strips tags from title", () => {
      const result = parseTaskLine("- [ ] Task #tag");
      expect(result?.title).not.toContain("#tag");
      expect(result?.title).toBe("Task");
    });
  });

  describe("task ID parsing (🆔)", () => {
    it("parses a task ID", () => {
      const result = parseTaskLine("- [ ] Task 🆔 abc123");
      expect(result?.taskId).toBe("abc123");
    });
  });

  describe("depends-on parsing (⛔)", () => {
    it("parses depends-on IDs", () => {
      const result = parseTaskLine("- [ ] Task ⛔ abc123,def456");
      expect(result?.dependsOn).toContain("abc123");
      expect(result?.dependsOn).toContain("def456");
    });
  });

  describe("combined emoji parsing", () => {
    it("parses all emojis on a single task line", () => {
      const result = parseTaskLine(
        "- [ ] Write report 📅 2026-03-10 ⏫ 🔁 every week #work"
      );
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Write report");
      expect(result?.dueDate).toBe("2026-03-10");
      expect(result?.priority).toBe("high");
      expect(result?.recurrence).toBe("every week");
      expect(result?.tags).toContain("work");
    });

    it("parses a completed task with all dates", () => {
      const result = parseTaskLine(
        "- [x] Done task ➕ 2026-03-01 🛫 2026-03-03 📅 2026-03-05 ✅ 2026-03-04"
      );
      expect(result?.completed).toBe(true);
      expect(result?.createdDate).toBe("2026-03-01");
      expect(result?.startDate).toBe("2026-03-03");
      expect(result?.dueDate).toBe("2026-03-05");
      expect(result?.doneDate).toBe("2026-03-04");
    });
  });

  describe("edge cases", () => {
    it("handles a task with only whitespace title after emoji stripping... actually has real title", () => {
      const result = parseTaskLine("- [ ] Real title 📅 2026-01-01");
      expect(result?.title).toBe("Real title");
    });

    it("handles asterisk list markers", () => {
      const result = parseTaskLine("* [ ] Asterisk task");
      expect(result?.title).toBe("Asterisk task");
    });
  });
});
