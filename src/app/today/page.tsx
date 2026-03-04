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

  return (
    <TodayClient
      today={today}
      initialDueTasks={dueTasks}
      initialNoteContent={dailyNote.content}
    />
  );
}
