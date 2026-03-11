import { describe, it, expect } from "vitest";
import { parseTaskLine } from "../task-line-parser";
import { serializeTaskLine } from "../task-line-serializer";
import type { Task } from "../schemas";

function roundTrip(line: string): ReturnType<typeof parseTaskLine> {
  const parsed = parseTaskLine(line);
  if (!parsed) return null;
  const serialized = serializeTaskLine(parsed as Task);
  return parseTaskLine(serialized);
}

describe("round-trip: parse → serialize → parse", () => {
  it("preserves title", () => {
    const result = roundTrip("- [ ] Buy groceries");
    expect(result?.title).toBe("Buy groceries");
  });

  it("preserves completion status (incomplete)", () => {
    const result = roundTrip("- [ ] Task");
    expect(result?.completed).toBe(false);
  });

  it("preserves completion status (complete)", () => {
    const result = roundTrip("- [x] Task");
    expect(result?.completed).toBe(true);
  });

  it("preserves due date", () => {
    const result = roundTrip("- [ ] Task 📅 2026-03-10");
    expect(result?.dueDate).toBe("2026-03-10");
  });

  it("preserves done date", () => {
    const result = roundTrip("- [x] Task ✅ 2026-03-04");
    expect(result?.doneDate).toBe("2026-03-04");
  });

  it("preserves scheduled date", () => {
    const result = roundTrip("- [ ] Task ⏳ 2026-03-08");
    expect(result?.scheduledDate).toBe("2026-03-08");
  });

  it("preserves created date", () => {
    const result = roundTrip("- [ ] Task ➕ 2026-03-01");
    expect(result?.createdDate).toBe("2026-03-01");
  });

  it("preserves start date", () => {
    const result = roundTrip("- [ ] Task 🛫 2026-03-05");
    expect(result?.startDate).toBe("2026-03-05");
  });

  it("preserves high priority", () => {
    const result = roundTrip("- [ ] Task ⏫");
    expect(result?.priority).toBe("high");
  });

  it("preserves medium priority", () => {
    const result = roundTrip("- [ ] Task 🔼");
    expect(result?.priority).toBe("medium");
  });

  it("preserves low priority", () => {
    const result = roundTrip("- [ ] Task 🔽");
    expect(result?.priority).toBe("low");
  });

  it("preserves recurrence rule", () => {
    const result = roundTrip("- [ ] Workout 🔁 every day");
    expect(result?.recurrence).toBe("every day");
  });

  it("preserves tags", () => {
    const result = roundTrip("- [ ] Task #work #personal");
    expect(result?.tags).toContain("work");
    expect(result?.tags).toContain("personal");
  });

  it("preserves all fields together", () => {
    const line = "- [ ] Write report 📅 2026-03-10 ⏫ 🔁 every week #work";
    const result = roundTrip(line);
    expect(result?.title).toBe("Write report");
    expect(result?.dueDate).toBe("2026-03-10");
    expect(result?.priority).toBe("high");
    expect(result?.recurrence).toBe("every week");
    expect(result?.tags).toContain("work");
  });

  it("preserves mentions", () => {
    const result = roundTrip("- [ ] Follow up with [[@Roberto Almeida]]");
    expect(result?.mentions).toEqual(["Roberto Almeida"]);
    expect(result?.title).toContain("[[@Roberto Almeida]]");
  });

  it("preserves multiple mentions with other fields", () => {
    const line =
      "- [ ] Meeting with [[@Alice]] and [[@Bob]] 📅 2026-03-10 #work";
    const result = roundTrip(line);
    expect(result?.mentions).toEqual(["Alice", "Bob"]);
    expect(result?.dueDate).toBe("2026-03-10");
    expect(result?.tags).toContain("work");
  });

  it("round-trips all sample vault task lines", () => {
    const sampleLines = [
      "- [ ] Review meeting notes from last week",
      "- [ ] Buy groceries 📅 2026-03-05",
      "- [ ] Call dentist ⏫",
      "- [ ] Set up home server 🔼",
      "- [ ] Implement markdown engine 📅 2026-03-10 ⏫",
      "- [x] Initialize Next.js project ✅ 2026-03-04",
      "- [ ] Morning workout 🔁 every day ⏫",
      "- [ ] Review monthly budget 🔁 every month 📅 2026-03-31 🔼",
    ];

    for (const line of sampleLines) {
      const parsed1 = parseTaskLine(line);
      expect(parsed1, `Failed to parse: ${line}`).not.toBeNull();
      const serialized = serializeTaskLine(parsed1 as Task);
      const parsed2 = parseTaskLine(serialized);
      expect(parsed2, `Failed to re-parse: ${serialized}`).not.toBeNull();
      // Core fields must be preserved
      expect(parsed2?.title).toBe(parsed1?.title);
      expect(parsed2?.completed).toBe(parsed1?.completed);
      expect(parsed2?.dueDate).toBe(parsed1?.dueDate);
      expect(parsed2?.doneDate).toBe(parsed1?.doneDate);
      expect(parsed2?.priority).toBe(parsed1?.priority);
      expect(parsed2?.recurrence).toBe(parsed1?.recurrence);
    }
  });
});
