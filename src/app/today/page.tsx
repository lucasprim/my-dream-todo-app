import { getDb, getVaultDir } from "@/lib/db-server";
import {
  getTasksScheduledForDate,
  getCarryForwardTasks,
  getAvailableTasksForPlanning,
  getCalendarEventsForDate,
} from "@/db/queries";
import { createOrGetDailyNote, isPlanningComplete } from "@/app/actions/daily-note-actions-impl";
import { getTimezone, getTodayInTimezone } from "@/lib/timezone";
import { TodayClient } from "./today-client";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const db = getDb();
  const timezone = getTimezone(db);
  const today = getTodayInTimezone(timezone);
  const vaultDir = getVaultDir();

  const dailyNote = await createOrGetDailyNote(db, vaultDir, today);
  const planned = isPlanningComplete(dailyNote.content);

  const [scheduledTasks, carryForwardTasks, availableTasks, calendarEvents] = await Promise.all([
    getTasksScheduledForDate(db, today),
    getCarryForwardTasks(db, today),
    getAvailableTasksForPlanning(db, today),
    getCalendarEventsForDate(db, today),
  ]);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <TodayClient
      today={today}
      formattedDate={formattedDate}
      planned={planned}
      scheduledTasks={scheduledTasks}
      carryForwardTasks={carryForwardTasks}
      availableTasks={availableTasks}
      calendarEvents={calendarEvents}
      timezone={timezone}
    />
  );
}
