"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Clock, MapPin } from "lucide-react";
import type { CalendarEvent } from "@/db/schema";
import { toggleCalendarEventAction } from "@/app/actions/calendar-actions";
import { format, parseISO, isPast } from "date-fns";

interface CalendarEventItemProps {
  event: CalendarEvent;
}

export function CalendarEventItem({ event }: CalendarEventItemProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isCompleted = event.completed === 1;
  const endTime = parseISO(event.endTime);
  const isInPast = isPast(endTime);

  const handleToggle = () => {
    startTransition(async () => {
      await toggleCalendarEventAction(event.id);
      router.refresh();
    });
  };

  const startFormatted = format(parseISO(event.startTime), "h:mm a");
  const endFormatted = format(endTime, "h:mm a");

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors",
        isPending && "opacity-50",
        isInPast && !isCompleted && "opacity-60"
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {event.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {startFormatted} – {endFormatted}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
          {event.calendarName && (
            <span className="text-xs text-muted-foreground">
              {event.calendarName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
