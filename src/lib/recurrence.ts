/**
 * Parse an Obsidian-style recurrence rule and return the next due date
 * after the given base date.
 *
 * Uses the rrule-based mapping layer for complex patterns, with a regex
 * fallback for any patterns it doesn't recognize.
 */

import { nextDateFromRule, isAfterCompletion } from "./recurrence-rules";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export { isAfterCompletion };

export function nextRecurrenceDate(
  recurrence: string,
  baseDateStr: string
): string | null {
  // Try the rrule-based engine first
  const rruleResult = nextDateFromRule(recurrence, baseDateStr);
  if (rruleResult) return rruleResult;

  // Fallback to legacy regex logic for unrecognized patterns
  return legacyNextDate(recurrence, baseDateStr);
}

function legacyNextDate(
  recurrence: string,
  baseDateStr: string
): string | null {
  const rule = recurrence.toLowerCase().trim();
  const base = new Date(baseDateStr + "T12:00:00Z");

  // every N days / every day
  const dayMatch = rule.match(/^every\s+(?:(\d+)\s+)?day(?:s)?$/);
  if (dayMatch) {
    const n = parseInt(dayMatch[1] ?? "1", 10);
    base.setUTCDate(base.getUTCDate() + n);
    return base.toISOString().slice(0, 10);
  }

  // every weekday
  if (rule === "every weekday") {
    base.setUTCDate(base.getUTCDate() + 1);
    while (base.getUTCDay() === 0 || base.getUTCDay() === 6) {
      base.setUTCDate(base.getUTCDate() + 1);
    }
    return base.toISOString().slice(0, 10);
  }

  // every N weeks / every week
  const weekMatch = rule.match(/^every\s+(?:(\d+)\s+)?week(?:s)?$/);
  if (weekMatch) {
    const n = parseInt(weekMatch[1] ?? "1", 10);
    base.setUTCDate(base.getUTCDate() + n * 7);
    return base.toISOString().slice(0, 10);
  }

  // every Monday/Tuesday/…
  const dowMatch = rule.match(/^every\s+(\w+)$/);
  if (dowMatch) {
    const dayName = dowMatch[1]!;
    const targetDow = DAY_NAMES.indexOf(dayName);
    if (targetDow !== -1) {
      base.setUTCDate(base.getUTCDate() + 1);
      while (base.getUTCDay() !== targetDow) {
        base.setUTCDate(base.getUTCDate() + 1);
      }
      return base.toISOString().slice(0, 10);
    }
  }

  // every N months / every month
  const monthMatch = rule.match(/^every\s+(?:(\d+)\s+)?month(?:s)?$/);
  if (monthMatch) {
    const n = parseInt(monthMatch[1] ?? "1", 10);
    base.setUTCMonth(base.getUTCMonth() + n);
    return base.toISOString().slice(0, 10);
  }

  // every N years / every year
  const yearMatch = rule.match(/^every\s+(?:(\d+)\s+)?year(?:s)?$/);
  if (yearMatch) {
    const n = parseInt(yearMatch[1] ?? "1", 10);
    base.setUTCFullYear(base.getUTCFullYear() + n);
    return base.toISOString().slice(0, 10);
  }

  return null;
}
