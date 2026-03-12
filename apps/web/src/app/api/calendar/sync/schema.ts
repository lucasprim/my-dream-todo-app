import { z } from "zod";

export const calendarEventInputSchema = z.object({
  external_id: z.string().min(1),
  title: z.string().min(1),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().optional(),
  description: z.string().optional(),
  calendar_name: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const syncWindowSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const calendarSyncInputSchema = z
  .object({
    events: z.array(calendarEventInputSchema),
    sync_window: syncWindowSchema.optional(),
  })
  .refine((data) => data.events.length > 0 || data.sync_window !== undefined, {
    message: "Either events must be non-empty or sync_window must be provided",
  });

export type CalendarEventInput = z.infer<typeof calendarEventInputSchema>;
export type CalendarSyncInput = z.infer<typeof calendarSyncInputSchema>;
export type SyncWindow = z.infer<typeof syncWindowSchema>;
