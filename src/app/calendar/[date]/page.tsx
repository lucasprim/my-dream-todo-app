import { getDb, getVaultDir } from "@/lib/db-server";
import { createOrGetDailyNote } from "@/app/actions/daily-note-actions-impl";
import { DailyNoteClient } from "./daily-note-client";

export const dynamic = "force-dynamic";

interface DailyNotePageProps {
  params: Promise<{ date: string }>;
}

export default async function DailyNotePage({ params }: DailyNotePageProps) {
  const { date } = await params;
  const db = getDb();
  const vaultDir = getVaultDir();
  const note = await createOrGetDailyNote(db, vaultDir, date);

  return <DailyNoteClient date={date} initialContent={note.content} />;
}
