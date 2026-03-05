/**
 * Mapping layer between human-readable recurrence text and RRULE objects.
 *
 * Supports:
 *   Simple:        every day, every 3 weeks, every month, every year
 *   Multi-day:     every Mon/Wed/Fri, every weekday, every weekend
 *   Ordinal:       every 2nd Tuesday, every 1st weekday, every last Friday
 *   Monthly:       every last day of month, every last weekday of month
 *   After-completion: every! day, every! 2 weeks (next date relative to completion, not due date)
 */

import { RRule, Weekday } from "rrule";

const DAY_MAP: Record<string, Weekday> = {
  monday: RRule.MO,
  mon: RRule.MO,
  tuesday: RRule.TU,
  tue: RRule.TU,
  wednesday: RRule.WE,
  wed: RRule.WE,
  thursday: RRule.TH,
  thu: RRule.TH,
  friday: RRule.FR,
  fri: RRule.FR,
  saturday: RRule.SA,
  sat: RRule.SA,
  sunday: RRule.SU,
  sun: RRule.SU,
};

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const ORDINAL_MAP: Record<string, number> = {
  "1st": 1,
  first: 1,
  "2nd": 2,
  second: 2,
  "3rd": 3,
  third: 3,
  "4th": 4,
  fourth: 4,
  last: -1,
};

export interface RecurrenceRule {
  rrule: RRule;
  afterCompletion: boolean;
}

/**
 * Returns whether the recurrence text uses "after completion" mode (every! prefix).
 */
export function isAfterCompletion(text: string): boolean {
  return /^every!\s/i.test(text.trim());
}

/**
 * Parse human-readable recurrence text into an RRule + afterCompletion flag.
 * Returns null if the text cannot be parsed.
 */
export function parseRecurrenceText(
  text: string,
  baseDate: Date
): RecurrenceRule | null {
  const raw = text.trim();
  const afterComp = isAfterCompletion(raw);
  // Normalize: strip "every!" or "every" prefix
  const body = raw
    .replace(/^every!\s*/i, "")
    .replace(/^every\s*/i, "")
    .trim()
    .toLowerCase();

  const dtstart = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      12,
      0,
      0
    )
  );

  const rule = parseBody(body, dtstart);
  if (!rule) return null;

  return { rrule: rule, afterCompletion: afterComp };
}

function parseBody(body: string, dtstart: Date): RRule | null {
  // "day" / "N days"
  const dayMatch = body.match(/^(?:(\d+)\s+)?days?$/);
  if (dayMatch) {
    return new RRule({
      freq: RRule.DAILY,
      interval: parseInt(dayMatch[1] ?? "1", 10),
      dtstart,
    });
  }

  // "weekday" / "weekdays"
  if (/^weekdays?$/.test(body)) {
    return new RRule({
      freq: RRule.WEEKLY,
      byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
      dtstart,
    });
  }

  // "weekend" / "weekends"
  if (/^weekends?$/.test(body)) {
    return new RRule({
      freq: RRule.WEEKLY,
      byweekday: [RRule.SA, RRule.SU],
      dtstart,
    });
  }

  // "Mon/Wed/Fri" (multi-day with slashes)
  const slashDayMatch = body.match(
    /^([a-z]{3}(?:\/[a-z]{3})+)$/
  );
  if (slashDayMatch) {
    const dayNames = slashDayMatch[1]!.split("/");
    const weekdays = dayNames.map((d) => DAY_MAP[d]).filter(Boolean) as Weekday[];
    if (weekdays.length === dayNames.length && weekdays.length > 0) {
      return new RRule({
        freq: RRule.WEEKLY,
        byweekday: weekdays,
        dtstart,
      });
    }
  }

  // "last day of month"
  if (/^last\s+day\s+of\s+month$/.test(body)) {
    return new RRule({
      freq: RRule.MONTHLY,
      bymonthday: [-1],
      dtstart,
    });
  }

  // "last weekday of month"
  if (/^last\s+weekday\s+of\s+month$/.test(body)) {
    return new RRule({
      freq: RRule.MONTHLY,
      byweekday: [
        RRule.MO.nth(-1),
        RRule.TU.nth(-1),
        RRule.WE.nth(-1),
        RRule.TH.nth(-1),
        RRule.FR.nth(-1),
      ],
      bysetpos: [-1],
      dtstart,
    });
  }

  // Ordinal day-of-week: "2nd Tuesday", "1st weekday", "last Friday"
  const ordinalMatch = body.match(
    /^(1st|first|2nd|second|3rd|third|4th|fourth|last)\s+(\w+)$/
  );
  if (ordinalMatch) {
    const pos = ORDINAL_MAP[ordinalMatch[1]!]!;
    const dayName = ordinalMatch[2]!;

    if (dayName === "weekday") {
      // Nth weekday of month
      return new RRule({
        freq: RRule.MONTHLY,
        byweekday: [
          RRule.MO.nth(pos),
          RRule.TU.nth(pos),
          RRule.WE.nth(pos),
          RRule.TH.nth(pos),
          RRule.FR.nth(pos),
        ],
        bysetpos: [pos],
        dtstart,
      });
    }

    const weekday = DAY_MAP[dayName];
    if (weekday) {
      return new RRule({
        freq: RRule.MONTHLY,
        byweekday: [weekday.nth(pos)],
        dtstart,
      });
    }
  }

  // Single named day: "monday", "fri", etc.
  const singleDay = DAY_MAP[body];
  if (singleDay) {
    return new RRule({
      freq: RRule.WEEKLY,
      byweekday: [singleDay],
      dtstart,
    });
  }

  // Compound weekly + multi-day: "2 weeks on mon/wed/fri"
  const compoundWeekMatch = body.match(
    /^(?:(\d+)\s+)?weeks?\s+on\s+([a-z]{3}(?:\/[a-z]{3})+)$/
  );
  if (compoundWeekMatch) {
    const dayNames = compoundWeekMatch[2]!.split("/");
    const weekdays = dayNames
      .map((d) => DAY_MAP[d])
      .filter(Boolean) as Weekday[];
    if (weekdays.length === dayNames.length && weekdays.length > 0) {
      return new RRule({
        freq: RRule.WEEKLY,
        interval: parseInt(compoundWeekMatch[1] ?? "1", 10),
        byweekday: weekdays,
        dtstart,
      });
    }
  }

  // "N weeks" / "week"
  const weekMatch = body.match(/^(?:(\d+)\s+)?weeks?$/);
  if (weekMatch) {
    return new RRule({
      freq: RRule.WEEKLY,
      interval: parseInt(weekMatch[1] ?? "1", 10),
      dtstart,
    });
  }

  // Compound monthly + ordinal: "2 months on the last friday"
  const compoundMonthMatch = body.match(
    /^(?:(\d+)\s+)?months?\s+on\s+(?:the\s+)?(1st|first|2nd|second|3rd|third|4th|fourth|last)\s+(\w+)$/
  );
  if (compoundMonthMatch) {
    const interval = parseInt(compoundMonthMatch[1] ?? "1", 10);
    const pos = ORDINAL_MAP[compoundMonthMatch[2]!]!;
    const dayName = compoundMonthMatch[3]!;

    if (dayName === "weekday") {
      return new RRule({
        freq: RRule.MONTHLY,
        interval,
        byweekday: [
          RRule.MO.nth(pos),
          RRule.TU.nth(pos),
          RRule.WE.nth(pos),
          RRule.TH.nth(pos),
          RRule.FR.nth(pos),
        ],
        bysetpos: [pos],
        dtstart,
      });
    }

    const weekday = DAY_MAP[dayName];
    if (weekday) {
      return new RRule({
        freq: RRule.MONTHLY,
        interval,
        byweekday: [weekday.nth(pos)],
        dtstart,
      });
    }
  }

  // Monthly specific day numbers: "month each 5,15,20", "2 months each 1,15"
  const monthEachMatch = body.match(
    /^(?:(\d+)\s+)?months?\s+each\s+([\d,]+)$/
  );
  if (monthEachMatch) {
    const interval = parseInt(monthEachMatch[1] ?? "1", 10);
    const days = monthEachMatch[2]!.split(",").map((d) => parseInt(d.trim(), 10));
    if (days.every((d) => d >= 1 && d <= 31)) {
      return new RRule({
        freq: RRule.MONTHLY,
        interval,
        bymonthday: days,
        dtstart,
      });
    }
  }

  // "N months" / "month" — handled via manual clamping (not rrule)
  // rrule skips months that don't have the target day (e.g., Jan 31 → skips Feb)
  if (/^(?:\d+\s+)?months?$/.test(body)) return null;

  // Yearly months + ordinal: "year in mar on the last friday", "2 years in jan/jun on the 2nd tuesday"
  const yearOrdinalMatch = body.match(
    /^(?:(\d+)\s+)?years?\s+in\s+([a-z]{3,}(?:\/[a-z]{3,})*)\s+on\s+(?:the\s+)?(1st|first|2nd|second|3rd|third|4th|fourth|last)\s+(\w+)$/
  );
  if (yearOrdinalMatch) {
    const interval = parseInt(yearOrdinalMatch[1] ?? "1", 10);
    const monthNames = yearOrdinalMatch[2]!.split("/");
    const bymonth = monthNames.map((m) => MONTH_MAP[m]).filter(Boolean) as number[];
    if (bymonth.length === monthNames.length) {
      const pos = ORDINAL_MAP[yearOrdinalMatch[3]!]!;
      const dayName = yearOrdinalMatch[4]!;

      if (dayName === "weekday") {
        return new RRule({
          freq: RRule.YEARLY,
          interval,
          bymonth,
          byweekday: [
            RRule.MO.nth(pos),
            RRule.TU.nth(pos),
            RRule.WE.nth(pos),
            RRule.TH.nth(pos),
            RRule.FR.nth(pos),
          ],
          bysetpos: [pos],
          dtstart,
        });
      }

      const weekday = DAY_MAP[dayName];
      if (weekday) {
        return new RRule({
          freq: RRule.YEARLY,
          interval,
          bymonth,
          byweekday: [weekday.nth(pos)],
          dtstart,
        });
      }
    }
  }

  // Yearly month selection: "year in jan/jul", "2 years in mar"
  const yearMonthMatch = body.match(
    /^(?:(\d+)\s+)?years?\s+in\s+([a-z]{3,}(?:\/[a-z]{3,})*)$/
  );
  if (yearMonthMatch) {
    const interval = parseInt(yearMonthMatch[1] ?? "1", 10);
    const monthNames = yearMonthMatch[2]!.split("/");
    const bymonth = monthNames.map((m) => MONTH_MAP[m]).filter(Boolean) as number[];
    if (bymonth.length === monthNames.length) {
      return new RRule({
        freq: RRule.YEARLY,
        interval,
        bymonth,
        bymonthday: [dtstart.getUTCDate()],
        dtstart,
      });
    }
  }

  // "N years" / "year" — handled via manual clamping (not rrule)
  // rrule skips years without Feb 29 for leap-day dates
  if (/^(?:\d+\s+)?years?$/.test(body)) return null;

  return null;
}

/**
 * Given a human-readable recurrence string and a base date, return the next occurrence date.
 * Returns null if the pattern is not recognized.
 */
export function nextDateFromRule(
  text: string,
  baseDateStr: string
): string | null {
  const base = new Date(baseDateStr + "T12:00:00Z");
  const parsed = parseRecurrenceText(text, base);
  if (!parsed) return null;

  const after = new Date(base.getTime());
  // Move 1ms past the base so rrule.after() doesn't return the base date itself
  after.setUTCMilliseconds(after.getUTCMilliseconds() + 1);

  const next = parsed.rrule.after(after);
  if (!next) return null;

  return next.toISOString().slice(0, 10);
}
