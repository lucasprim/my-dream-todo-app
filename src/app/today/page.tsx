import { getDb, getVaultDir } from "@/lib/db-server";
import {
  getTasksScheduledForDate,
  getCarryForwardTasks,
  getAvailableTasksForPlanning,
} from "@/db/queries";
import { createOrGetDailyNote, isPlanningComplete } from "@/app/actions/daily-note-actions-impl";
import { TodayClient } from "./today-client";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();
  const vaultDir = getVaultDir();

  const dailyNote = await createOrGetDailyNote(db, vaultDir, today);
  const planned = isPlanningComplete(dailyNote.content);

  const [scheduledTasks, carryForwardTasks, availableTasks] = await Promise.all([
    getTasksScheduledForDate(db, today),
    getCarryForwardTasks(db, today),
    getAvailableTasksForPlanning(db, today),
  ]);

  const formattedDate = new Date(today + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <TodayClient
      today={today}
      formattedDate={formattedDate}
      planned={planned}
      scheduledTasks={scheduledTasks}
      carryForwardTasks={carryForwardTasks}
      availableTasks={availableTasks}
    />
  );
}
