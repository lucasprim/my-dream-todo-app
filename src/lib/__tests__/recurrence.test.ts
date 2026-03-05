import { describe, it, expect } from "vitest";
import { nextRecurrenceDate } from "../recurrence";
import {
  parseRecurrenceText,
  isAfterCompletion,
  nextDateFromRule,
} from "../recurrence-rules";

describe("nextRecurrenceDate", () => {
  describe("simple patterns", () => {
    it("every day", () => {
      expect(nextRecurrenceDate("every day", "2026-03-05")).toBe("2026-03-06");
    });

    it("every 3 days", () => {
      expect(nextRecurrenceDate("every 3 days", "2026-03-05")).toBe(
        "2026-03-08"
      );
    });

    it("every week", () => {
      expect(nextRecurrenceDate("every week", "2026-03-05")).toBe("2026-03-12");
    });

    it("every 2 weeks", () => {
      expect(nextRecurrenceDate("every 2 weeks", "2026-03-05")).toBe(
        "2026-03-19"
      );
    });

    it("every month", () => {
      expect(nextRecurrenceDate("every month", "2026-03-05")).toBe(
        "2026-04-05"
      );
    });

    it("every 3 months", () => {
      expect(nextRecurrenceDate("every 3 months", "2026-03-05")).toBe(
        "2026-06-05"
      );
    });

    it("every year", () => {
      expect(nextRecurrenceDate("every year", "2026-03-05")).toBe("2027-03-05");
    });

    it("every 2 years", () => {
      expect(nextRecurrenceDate("every 2 years", "2026-03-05")).toBe(
        "2028-03-05"
      );
    });
  });

  describe("weekday/weekend patterns", () => {
    it("every weekday from a Wednesday", () => {
      // 2026-03-04 is Wednesday → next weekday is Thursday
      expect(nextRecurrenceDate("every weekday", "2026-03-04")).toBe(
        "2026-03-05"
      );
    });

    it("every weekday from a Friday", () => {
      // 2026-03-06 is Friday → next weekday is Monday
      expect(nextRecurrenceDate("every weekday", "2026-03-06")).toBe(
        "2026-03-09"
      );
    });

    it("every weekday from a Saturday", () => {
      // 2026-03-07 is Saturday → next weekday is Monday
      expect(nextRecurrenceDate("every weekday", "2026-03-07")).toBe(
        "2026-03-09"
      );
    });

    it("every weekend from a Friday", () => {
      // 2026-03-06 is Friday → next weekend is Saturday
      expect(nextRecurrenceDate("every weekend", "2026-03-06")).toBe(
        "2026-03-07"
      );
    });

    it("every weekend from a Sunday", () => {
      // 2026-03-08 is Sunday → next weekend is Saturday 03-14
      expect(nextRecurrenceDate("every weekend", "2026-03-08")).toBe(
        "2026-03-14"
      );
    });
  });

  describe("multi-day patterns", () => {
    it("every Mon/Wed/Fri from a Monday", () => {
      // 2026-03-02 is Monday → next is Wednesday
      expect(nextRecurrenceDate("every mon/wed/fri", "2026-03-02")).toBe(
        "2026-03-04"
      );
    });

    it("every Mon/Wed/Fri from a Friday", () => {
      // 2026-03-06 is Friday → next is Monday
      expect(nextRecurrenceDate("every mon/wed/fri", "2026-03-06")).toBe(
        "2026-03-09"
      );
    });
  });

  describe("named day patterns", () => {
    it("every monday from a Wednesday", () => {
      // 2026-03-04 is Wednesday → next Monday is 2026-03-09
      expect(nextRecurrenceDate("every monday", "2026-03-04")).toBe(
        "2026-03-09"
      );
    });

    it("every friday from a Thursday", () => {
      // 2026-03-05 is Thursday → next Friday is 2026-03-06
      expect(nextRecurrenceDate("every friday", "2026-03-05")).toBe(
        "2026-03-06"
      );
    });

    it("every tuesday from a Tuesday", () => {
      // 2026-03-03 is Tuesday → next Tuesday is 2026-03-10
      expect(nextRecurrenceDate("every tuesday", "2026-03-03")).toBe(
        "2026-03-10"
      );
    });
  });

  describe("ordinal patterns", () => {
    it("every 2nd Tuesday of the month", () => {
      // 2026-03-10 is 2nd Tuesday of March → next is April 14
      expect(nextRecurrenceDate("every 2nd tuesday", "2026-03-10")).toBe(
        "2026-04-14"
      );
    });

    it("every 1st Monday of the month", () => {
      // 2026-03-02 is 1st Monday → next is April 6
      expect(nextRecurrenceDate("every 1st monday", "2026-03-02")).toBe(
        "2026-04-06"
      );
    });

    it("every last Friday of the month", () => {
      // 2026-03-27 is last Friday of March → next is April 24
      expect(nextRecurrenceDate("every last friday", "2026-03-27")).toBe(
        "2026-04-24"
      );
    });
  });

  describe("monthly special patterns", () => {
    it("every last day of month from March", () => {
      // Last day of March is 31 → next is April 30
      expect(nextRecurrenceDate("every last day of month", "2026-03-31")).toBe(
        "2026-04-30"
      );
    });

    it("every last day of month from January", () => {
      expect(nextRecurrenceDate("every last day of month", "2026-01-31")).toBe(
        "2026-02-28"
      );
    });

    it("every last weekday of month from March", () => {
      // Last weekday of March 2026 is Tuesday March 31
      // Next should be April's last weekday = Thursday April 30
      expect(
        nextRecurrenceDate("every last weekday of month", "2026-03-31")
      ).toBe("2026-04-30");
    });
  });

  describe("edge cases", () => {
    it("month overflow: Jan 31 + 1 month", () => {
      // Jan 31 + 1 month → Feb 28 (or 29 in leap year)
      const result = nextRecurrenceDate("every month", "2026-01-31");
      expect(result).toBe("2026-02-28");
    });

    it("leap year: Feb 28 2028 + 1 day", () => {
      // 2028 is a leap year
      expect(nextRecurrenceDate("every day", "2028-02-28")).toBe("2028-02-29");
    });

    it("leap year: Feb 29 2028 + 1 year clamps to Feb 28", () => {
      expect(nextRecurrenceDate("every year", "2028-02-29")).toBe("2029-02-28");
    });

    it("year boundary: Dec 31 + 1 day", () => {
      expect(nextRecurrenceDate("every day", "2026-12-31")).toBe("2027-01-01");
    });

    it("year boundary: Dec 31 + 1 week", () => {
      expect(nextRecurrenceDate("every week", "2026-12-31")).toBe("2027-01-07");
    });

    it("case insensitive", () => {
      expect(nextRecurrenceDate("Every Day", "2026-03-05")).toBe("2026-03-06");
      expect(nextRecurrenceDate("EVERY WEEK", "2026-03-05")).toBe("2026-03-12");
    });

    it("returns null for unrecognized patterns", () => {
      expect(nextRecurrenceDate("invalid", "2026-03-05")).toBeNull();
      expect(nextRecurrenceDate("", "2026-03-05")).toBeNull();
    });
  });

  describe("after-completion patterns", () => {
    it("every! day", () => {
      expect(nextRecurrenceDate("every! day", "2026-03-05")).toBe("2026-03-06");
    });

    it("every! 2 weeks", () => {
      expect(nextRecurrenceDate("every! 2 weeks", "2026-03-05")).toBe(
        "2026-03-19"
      );
    });

    it("every! month", () => {
      expect(nextRecurrenceDate("every! month", "2026-03-05")).toBe(
        "2026-04-05"
      );
    });
  });
});

describe("isAfterCompletion", () => {
  it("returns true for every! prefix", () => {
    expect(isAfterCompletion("every! day")).toBe(true);
    expect(isAfterCompletion("every! 2 weeks")).toBe(true);
  });

  it("returns false for every prefix", () => {
    expect(isAfterCompletion("every day")).toBe(false);
    expect(isAfterCompletion("every 2 weeks")).toBe(false);
  });
});

describe("parseRecurrenceText", () => {
  it("returns afterCompletion flag correctly", () => {
    const base = new Date("2026-03-05T12:00:00Z");
    const fixed = parseRecurrenceText("every day", base);
    expect(fixed?.afterCompletion).toBe(false);

    const afterComp = parseRecurrenceText("every! day", base);
    expect(afterComp?.afterCompletion).toBe(true);
  });

  it("returns null for unrecognized patterns", () => {
    const base = new Date("2026-03-05T12:00:00Z");
    expect(parseRecurrenceText("gibberish", base)).toBeNull();
  });
});
