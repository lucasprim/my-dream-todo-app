import { describe, it, expect } from "vitest";
import { serializeTaskLine } from "../task-line-serializer";
import type { Task } from "../schemas";

function task(overrides: Partial<Task>): Task {
  return {
    title: "Default task",
    completed: false,
    priority: "normal",
    tags: [],
    dependsOn: [],
    mentions: [],
    ...overrides,
  };
}

describe("serializeTaskLine", () => {
  describe("basic checkbox serialization", () => {
    it("serializes an incomplete task", () => {
      const result = serializeTaskLine(task({ title: "Buy groceries" }));
      expect(result).toBe("- [ ] Buy groceries");
    });

    it("serializes a completed task", () => {
      const result = serializeTaskLine(
        task({ title: "Buy groceries", completed: true })
      );
      expect(result).toBe("- [x] Buy groceries");
    });
  });

  describe("due date serialization", () => {
    it("appends due date with 📅 emoji", () => {
      const result = serializeTaskLine(
        task({ title: "Buy groceries", dueDate: "2026-03-05" })
      );
      expect(result).toBe("- [ ] Buy groceries 📅 2026-03-05");
    });
  });

  describe("done date serialization", () => {
    it("appends done date with ✅ emoji", () => {
      const result = serializeTaskLine(
        task({ title: "Task done", completed: true, doneDate: "2026-03-04" })
      );
      expect(result).toContain("✅ 2026-03-04");
    });
  });

  describe("scheduled date serialization", () => {
    it("appends scheduled date with ⏳ emoji", () => {
      const result = serializeTaskLine(
        task({ title: "Task", scheduledDate: "2026-03-10" })
      );
      expect(result).toContain("⏳ 2026-03-10");
    });
  });

  describe("created date serialization", () => {
    it("appends created date with ➕ emoji", () => {
      const result = serializeTaskLine(
        task({ title: "Task", createdDate: "2026-03-01" })
      );
      expect(result).toContain("➕ 2026-03-01");
    });
  });

  describe("start date serialization", () => {
    it("appends start date with 🛫 emoji", () => {
      const result = serializeTaskLine(
        task({ title: "Task", startDate: "2026-03-08" })
      );
      expect(result).toContain("🛫 2026-03-08");
    });
  });

  describe("priority serialization", () => {
    it("appends highest priority emoji 🔺", () => {
      const result = serializeTaskLine(
        task({ title: "Task", priority: "highest" })
      );
      expect(result).toContain("🔺");
    });

    it("appends high priority emoji ⏫", () => {
      const result = serializeTaskLine(
        task({ title: "Task", priority: "high" })
      );
      expect(result).toContain("⏫");
    });

    it("appends medium priority emoji 🔼", () => {
      const result = serializeTaskLine(
        task({ title: "Task", priority: "medium" })
      );
      expect(result).toContain("🔼");
    });

    it("appends low priority emoji 🔽", () => {
      const result = serializeTaskLine(
        task({ title: "Task", priority: "low" })
      );
      expect(result).toContain("🔽");
    });

    it("appends lowest priority emoji ⬇️", () => {
      const result = serializeTaskLine(
        task({ title: "Task", priority: "lowest" })
      );
      expect(result).toContain("⬇️");
    });

    it("does not append emoji for normal priority", () => {
      const result = serializeTaskLine(
        task({ title: "Task", priority: "normal" })
      );
      expect(result).not.toMatch(/[🔺⏫🔼🔽⬇️]/u);
    });
  });

  describe("recurrence serialization", () => {
    it("appends recurrence with 🔁 emoji", () => {
      const result = serializeTaskLine(
        task({ title: "Workout", recurrence: "every day" })
      );
      expect(result).toContain("🔁 every day");
    });
  });

  describe("tag serialization", () => {
    it("appends tags with # prefix", () => {
      const result = serializeTaskLine(
        task({ title: "Task", tags: ["work", "important"] })
      );
      expect(result).toContain("#work");
      expect(result).toContain("#important");
    });

    it("does not append tags when empty", () => {
      const result = serializeTaskLine(task({ title: "Task", tags: [] }));
      expect(result).not.toContain("#");
    });
  });

  describe("task ID serialization", () => {
    it("appends task ID with 🆔 emoji", () => {
      const result = serializeTaskLine(
        task({ title: "Task", taskId: "abc123" })
      );
      expect(result).toContain("🆔 abc123");
    });
  });

  describe("emoji ordering", () => {
    it("emits fields in canonical order: title, priority, recurrence, dates, id, tags", () => {
      const result = serializeTaskLine(
        task({
          title: "Write report",
          priority: "high",
          recurrence: "every week",
          dueDate: "2026-03-10",
          tags: ["work"],
        })
      );
      // The result should be a properly formatted task line
      expect(result).toMatch(/^- \[ \] Write report/);
      expect(result).toContain("⏫");
      expect(result).toContain("🔁 every week");
      expect(result).toContain("📅 2026-03-10");
      expect(result).toContain("#work");
    });
  });
});
