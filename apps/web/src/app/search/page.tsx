import { getDb } from "@/lib/db-server";
import { searchTasks } from "@/db/queries";
import { SearchClient } from "./search-client";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const db = getDb();
  const results = q && q.trim() ? await searchTasks(db, q.trim()) : [];

  return <SearchClient initialResults={results} initialQuery={q ?? ""} />;
}
