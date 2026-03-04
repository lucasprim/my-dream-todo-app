import Link from "next/link";
import { getDb } from "@/lib/db-server";
import { listDailyNotes } from "@/db/queries";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export default async function CalendarPage() {
  const db = getDb();
  const notes = await listDailyNotes(db);
  const noteDates = new Set(notes.map((n) => n.date));

  const today = new Date().toISOString().slice(0, 10);
  const todayDate = new Date(today + "T12:00:00");
  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();

  const { firstDay, daysInMonth } = buildMonthGrid(year, month);

  const monthLabel = todayDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build cell array: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{monthLabel}</h1>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`blank-${i}`} />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasNote = noteDates.has(dateStr);
          const isToday = dateStr === today;

          return (
            <Link
              key={dateStr}
              href={`/calendar/${dateStr}`}
              className={[
                "rounded-md p-2 text-sm text-center transition-colors",
                isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : hasNote
                  ? "bg-accent font-medium hover:bg-accent/70"
                  : "hover:bg-accent/50",
              ].join(" ")}
            >
              {day}
            </Link>
          );
        })}
      </div>

      {notes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Recent Notes
          </h2>
          <div className="space-y-1">
            {notes.slice(0, 10).map((note) => (
              <Link
                key={note.id}
                href={`/calendar/${note.date}`}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors text-sm"
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {note.date}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
