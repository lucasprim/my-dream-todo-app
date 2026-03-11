"use server";

import { getDb } from "@/lib/db-server";
import { getTimezone, setTimezone } from "@/lib/timezone";

export async function getTimezoneAction(): Promise<string> {
  return getTimezone(getDb());
}

export async function updateTimezoneAction(timezone: string): Promise<void> {
  setTimezone(getDb(), timezone);
}
