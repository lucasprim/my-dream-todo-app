import { notFound } from "next/navigation";
import { getDb } from "@/lib/db-server";
import { getProjectBySlug, getTasksByProject } from "@/db/queries";
import { ProjectClient } from "./project-client";

export const dynamic = "force-dynamic";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const db = getDb();
  const project = await getProjectBySlug(db, slug);

  if (!project) {
    notFound();
  }

  const tasks = await getTasksByProject(db, project.id);

  return <ProjectClient project={project} initialTasks={tasks} />;
}
