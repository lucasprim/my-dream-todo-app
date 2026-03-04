import { getDb, getVaultDir } from "@/lib/db-server";
import { getTasksDueToday } from "@/db/queries";
import { createOrGetDailyNote } from "@/app/actions/daily-note-actions-impl";
import { TodayClient } from "./today-client";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();
  const vaultDir = getVaultDir();

  const [dueTasks, dailyNote] = await Promise.all([
    getTasksDueToday(db, today),
    createOrGetDailyNote(db, vaultDir, today),
  ]);

  const formattedDate = new Date(today + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <TodayClient
      today={today}
      formattedDate={formattedDate}
      initialDueTasks={dueTasks}
      initialNoteContent={dailyNote.content}
    />
  );
}
