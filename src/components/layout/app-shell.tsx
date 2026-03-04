"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import type { Project, Area } from "@/db/schema";

const PUBLIC_PATHS = ["/login"];

interface AppShellProps {
  children: React.ReactNode;
  projects: Project[];
  areas: Area[];
}

export function AppShell({ children, projects, areas }: AppShellProps) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <Sidebar projects={projects} areas={areas} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
