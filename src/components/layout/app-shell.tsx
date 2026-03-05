"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import type { Project, Area, Person } from "@/db/schema";

const PUBLIC_PATHS = ["/login"];

interface AppShellProps {
  children: React.ReactNode;
  projects: Project[];
  areas: Area[];
  people: (Person & { taskCount: number })[];
}

export function AppShell({ children, projects, areas, people }: AppShellProps) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <Sidebar projects={projects} areas={areas} people={people} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
