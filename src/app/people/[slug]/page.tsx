import { notFound } from "next/navigation";
import { getDb } from "@/lib/db-server";
import { getPersonBySlug, getTasksByPerson } from "@/db/queries";
import { PersonClient } from "./person-client";

export const dynamic = "force-dynamic";

interface PersonDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const { slug } = await params;
  const db = getDb();
  const person = await getPersonBySlug(db, slug);

  if (!person) {
    notFound();
  }

  const tasks = await getTasksByPerson(db, person.id);

  return <PersonClient person={person} initialTasks={tasks} />;
}
