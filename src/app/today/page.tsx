import { getDb, getVaultDir } from "@/lib/db-server";
import {
  getTasksScheduledForDate,
  getCarryForwardTasks,
  getAvailableTasksForPlanning,
  getRecurringDueTasks,
  getCalendarEventsForDate,
} from "@/db/queries";
import { createOrGetDailyNote, isPlanningComplete } from "@/app/actions/daily-note-actions-impl";
import { getTimezone, getTodayInTimezone } from "@/lib/timezone";
import { nextRecurrenceDate } from "@/lib/recurrence";
import { TodayClient } from "./today-client";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const db = getDb();
  const timezone = getTimezone(db);
  const today = getTodayInTimezone(timezone);
  const vaultDir = getVaultDir();

  const dailyNote = await createOrGetDailyNote(db, vaultDir, today);
  const planned = isPlanningComplete(dailyNote.content);

  const [scheduledTasks, carryForwardTasks, availableTasks, recurringDueTasks, calendarEvents] = await Promise.all([
    getTasksScheduledForDate(db, today),
    getCarryForwardTasks(db, today),
    getAvailableTasksForPlanning(db, today),
    getRecurringDueTasks(db, today),
    getCalendarEventsForDate(db, today),
  ]);

  const filteredRecurringDueTasks = recurringDueTasks.filter((task) => {
    if (!task.recurrence) return true;
    if (!task.dueDate) {
      // No dueDate: show if today is a valid recurrence day.
      // Use yesterday as base: if next occurrence after yesterday <= today, it's due.
      const d = new Date(today + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      const yesterday = d.toISOString().slice(0, 10);
      const nextDue = nextRecurrenceDate(task.recurrence, yesterday);
      return nextDue !== null && nextDue <= today;
    }
    if (task.dueDate === today) return true;
    const nextDue = nextRecurrenceDate(task.recurrence, task.dueDate);
    return nextDue !== null && nextDue <= today;
  });

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
      recurringDueTasks={filteredRecurringDueTasks}
      calendarEvents={calendarEvents}
      timezone={timezone}
    />
  );
}
