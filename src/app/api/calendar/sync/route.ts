import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { validateToken } from "@/lib/validate-token";
import { calendarSyncInputSchema } from "./schema";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const db = getDb();

  // Validate bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }
  const token = authHeader.slice(7);
  if (!validateToken(db, token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = calendarSyncInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { events } = parsed.data;
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const event of events) {
    const existing = db
      .select()
      .from(schema.calendarEvents)
      .where(eq(schema.calendarEvents.externalId, event.external_id))
      .get();

    if (existing) {
      db.update(schema.calendarEvents)
        .set({
          title: event.title,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location ?? null,
          description: event.description ?? null,
          calendarName: event.calendar_name ?? null,
          date: event.date,
          updatedAt: now,
        })
        .where(eq(schema.calendarEvents.id, existing.id))
        .run();
      updated++;
    } else {
      db.insert(schema.calendarEvents)
        .values({
          externalId: event.external_id,
          title: event.title,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location ?? null,
          description: event.description ?? null,
          calendarName: event.calendar_name ?? null,
          date: event.date,
          completed: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      created++;
    }
  }

  return NextResponse.json({
    ok: true,
    summary: { total: events.length, created, updated },
  });
}
