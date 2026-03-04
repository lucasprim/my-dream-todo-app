"use server";

import { getDb, getVaultDir } from "@/lib/db-server";
import type { DailyNote } from "@/db/schema";
import {
  createOrGetDailyNote as _createOrGetDailyNote,
  updateDailyNoteContent as _updateDailyNoteContent,
} from "./daily-note-actions-impl";

export async function createOrGetDailyNoteAction(date: string): Promise<DailyNote> {
  const db = getDb();
  const vaultDir = getVaultDir();
  return _createOrGetDailyNote(db, vaultDir, date);
}

export async function updateDailyNoteContentAction(
  date: string,
  content: string
): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _updateDailyNoteContent(db, vaultDir, date, content);
}
