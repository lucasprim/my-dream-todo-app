import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/components/layout/session-provider";
import { getDb } from "@/lib/db-server";
import { listProjects, listAreas, listPeople } from "@/db/queries";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Tasks",
  description: "Obsidian-powered task management",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let areas: Awaited<ReturnType<typeof listAreas>> = [];
  let people: Awaited<ReturnType<typeof listPeople>> = [];

  try {
    const db = getDb();
    [projects, areas, people] = await Promise.all([
      listProjects(db),
      listAreas(db),
      listPeople(db),
    ]);
  } catch {
    // DB not yet ready (e.g. first boot) — sidebar renders with empty lists
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <SessionProvider>
          <AppShell projects={projects} areas={areas} people={people}>
            {children}
          </AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
