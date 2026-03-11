"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db-server";
import * as schema from "@/db/schema";

export async function toggleCalendarEventAction(eventId: number): Promise<void> {
  const db = getDb();
  const [event] = db
    .select()
    .from(schema.calendarEvents)
    .where(eq(schema.calendarEvents.id, eventId))
    .limit(1)
    .all();

  if (!event) return;

  db.update(schema.calendarEvents)
    .set({
      completed: event.completed ? 0 : 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.calendarEvents.id, eventId))
    .run();
}
