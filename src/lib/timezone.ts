import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const TIMEZONE_KEY = "timezone";
const DEFAULT_TIMEZONE = "UTC";

/** Read the configured timezone from the settings table (defaults to "UTC"). */
export function getTimezone(db: Db): string {
  const row = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, TIMEZONE_KEY))
    .get();
  return row?.value ?? DEFAULT_TIMEZONE;
}

/** Validate and persist a timezone string. Throws on invalid values. */
export function setTimezone(db: Db, tz: string): void {
  // Validate by attempting to create a formatter — throws RangeError if invalid
  Intl.DateTimeFormat("en-US", { timeZone: tz });

  db.insert(schema.settings)
    .values({ key: TIMEZONE_KEY, value: tz })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: tz } })
    .run();
}

/** Return today's date as YYYY-MM-DD in the given timezone. */
export function getTodayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

/** Format an ISO datetime string as "h:mm AM/PM" in the given timezone. */
export function formatTimeInTimezone(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
