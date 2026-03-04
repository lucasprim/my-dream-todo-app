import { notFound } from "next/navigation";
import { getDb } from "@/lib/db-server";
import { getAreaBySlug, getTasksByArea } from "@/db/queries";
import { AreaClient } from "./area-client";

export const dynamic = "force-dynamic";

interface AreaDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AreaDetailPage({ params }: AreaDetailPageProps) {
  const { slug } = await params;
  const db = getDb();
  const area = await getAreaBySlug(db, slug);

  if (!area) {
    notFound();
  }

  const tasks = await getTasksByArea(db, area.id);

  return <AreaClient area={area} initialTasks={tasks} />;
}
