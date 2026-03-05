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

  describe("monthly specific day numbers", () => {
    it("single day: every month each 15", () => {
      // 2026-03-15 → next occurrence on the 15th is April 15
      expect(nextRecurrenceDate("every month each 15", "2026-03-15")).toBe(
        "2026-04-15"
      );
    });

    it("multi-day same month: every month each 5,15,20 from day 5", () => {
      // 2026-03-05 → next is the 15th of same month
      expect(nextRecurrenceDate("every month each 5,15,20", "2026-03-05")).toBe(
        "2026-03-15"
      );
    });

    it("wrap to next month: every month each 5,15 from day 20", () => {
      // 2026-03-20 → next is April 5
      expect(nextRecurrenceDate("every month each 5,15", "2026-03-20")).toBe(
        "2026-04-05"
      );
    });

    it("interval > 1: every 2 months each 10", () => {
      // 2026-03-10 → next is May 10
      expect(nextRecurrenceDate("every 2 months each 10", "2026-03-10")).toBe(
        "2026-05-10"
      );
    });

    it("day 31 skips short months", () => {
      // 2026-01-31 → Feb has no 31, March 31
      expect(nextRecurrenceDate("every month each 31", "2026-01-31")).toBe(
        "2026-03-31"
      );
    });

    it("multi-day with 28+31 in Feb", () => {
      // 2026-01-31 each 28,31 → Feb 28 is next
      expect(nextRecurrenceDate("every month each 28,31", "2026-01-31")).toBe(
        "2026-02-28"
      );
    });
  });

  describe("yearly month selection", () => {
    it("single month: every year in jul", () => {
      // base 2026-03-15, dtstart day=15 → Jul 15 2026
      expect(nextRecurrenceDate("every year in jul", "2026-03-15")).toBe(
        "2026-07-15"
      );
    });

    it("multi-month same year: every year in jan/jul from Feb", () => {
      // base 2026-02-10, dtstart day=10 → Jul 10 2026
      expect(nextRecurrenceDate("every year in jan/jul", "2026-02-10")).toBe(
        "2026-07-10"
      );
    });

    it("wrap to next year: every year in jan/jul from Aug", () => {
      // base 2026-08-10 → next is Jan 10 2027
      expect(nextRecurrenceDate("every year in jan/jul", "2026-08-10")).toBe(
        "2027-01-10"
      );
    });

    it("interval > 1: every 2 years in mar", () => {
      // base 2026-03-05 → next is 2028-03-05
      expect(nextRecurrenceDate("every 2 years in mar", "2026-03-05")).toBe(
        "2028-03-05"
      );
    });
  });

  describe("yearly month selection with ordinal day", () => {
    it("last friday in mar", () => {
      // Last Friday of March 2026 is March 27 → next is March 26 2027
      expect(
        nextRecurrenceDate("every year in mar on the last friday", "2026-03-27")
      ).toBe("2027-03-26");
    });

    it("2nd tuesday in jan/jun", () => {
      // 2026-01-13 is 2nd Tue of Jan → next is 2nd Tue of Jun = Jun 9
      expect(
        nextRecurrenceDate("every year in jan/jun on the 2nd tuesday", "2026-01-13")
      ).toBe("2026-06-09");
    });

    it("4th thursday in nov (Thanksgiving)", () => {
      // 4th Thursday of Nov 2026 is Nov 26 → next is Nov 25 2027
      expect(
        nextRecurrenceDate("every year in nov on the 4th thursday", "2026-11-26")
      ).toBe("2027-11-25");
    });

    it("1st weekday in jan", () => {
      // 1st weekday of Jan 2026 is Jan 1 (Thu) → next is Jan 1 2027 (Fri)
      expect(
        nextRecurrenceDate("every year in jan on the 1st weekday", "2026-01-01")
      ).toBe("2027-01-01");
    });
  });

  describe("after-completion variants for new patterns", () => {
    it("every! month each 5,15", () => {
      expect(nextRecurrenceDate("every! month each 5,15", "2026-03-05")).toBe(
        "2026-03-15"
      );
      expect(isAfterCompletion("every! month each 5,15")).toBe(true);
    });

    it("every! year in jul", () => {
      expect(nextRecurrenceDate("every! year in jul", "2026-03-15")).toBe(
        "2026-07-15"
      );
      expect(isAfterCompletion("every! year in jul")).toBe(true);
    });

    it("every! year in mar on the last friday", () => {
      expect(
        nextRecurrenceDate("every! year in mar on the last friday", "2026-03-27")
      ).toBe("2027-03-26");
      expect(isAfterCompletion("every! year in mar on the last friday")).toBe(true);
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

  describe("compound patterns", () => {
    it("every 2 months on the last friday", () => {
      // 2026-03-27 is last Friday of March → next is last Friday of May = May 29
      expect(
        nextRecurrenceDate("every 2 months on the last friday", "2026-03-27")
      ).toBe("2026-05-29");
    });

    it("every 3 months on the 2nd tuesday", () => {
      // 2026-03-10 is 2nd Tuesday of March → next is 2nd Tuesday of June = June 9
      expect(
        nextRecurrenceDate("every 3 months on the 2nd tuesday", "2026-03-10")
      ).toBe("2026-06-09");
    });

    it("every month on the 1st monday (interval=1)", () => {
      // 2026-03-02 is 1st Monday of March → next is 1st Monday of April = April 6
      expect(
        nextRecurrenceDate("every month on the 1st monday", "2026-03-02")
      ).toBe("2026-04-06");
    });

    it("every 2 months on the last weekday", () => {
      // 2026-03-31 is last weekday of March (Tuesday) → next is last weekday of May = May 29 (Friday)
      expect(
        nextRecurrenceDate("every 2 months on the last weekday", "2026-03-31")
      ).toBe("2026-05-29");
    });

    it("every 2 weeks on mon/wed/fri", () => {
      // 2026-03-02 is Monday, dtstart week; next in same week = Wed March 4
      expect(
        nextRecurrenceDate("every 2 weeks on mon/wed/fri", "2026-03-02")
      ).toBe("2026-03-04");
    });

    it("every 3 weeks on tue/thu", () => {
      // 2026-03-03 is Tuesday, dtstart week; next in same week = Thu March 5
      expect(
        nextRecurrenceDate("every 3 weeks on tue/thu", "2026-03-03")
      ).toBe("2026-03-05");
    });

    it("every! 2 months on the last friday (after completion)", () => {
      expect(
        nextRecurrenceDate("every! 2 months on the last friday", "2026-03-27")
      ).toBe("2026-05-29");
      expect(isAfterCompletion("every! 2 months on the last friday")).toBe(true);
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
