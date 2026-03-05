"use server";

import { getDb } from "@/lib/db-server";
import { searchPeople } from "@/db/queries";
import type { Person } from "@/db/schema";

export async function searchPeopleAction(
  query: string
): Promise<Person[]> {
  const db = getDb();
  return searchPeople(db, query);
}
