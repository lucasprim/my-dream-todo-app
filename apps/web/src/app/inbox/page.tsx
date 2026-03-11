import { getDb, getVaultDir } from "@/lib/db-server";
import { getPendingTasks, listProjects, listAreas } from "@/db/queries";
import { InboxClient } from "./inbox-client";
import { VAULT_FILES } from "@/lib/vault-config";
import { getTimezone, getTodayInTimezone } from "@/lib/timezone";
import type { DbTask, Project, Area } from "@/db/schema";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export interface TaskGroup {
  key: string;
  title: string;
  icon: "inbox" | "project" | "area" | "other";
  href?: string;
  tasks: DbTask[];
}

export default async function InboxPage() {
  const db = getDb();
  const vaultDir = getVaultDir();

  // Ensure inbox file exists
  const inboxPath = path.join(vaultDir, VAULT_FILES.INBOX);
  if (!fs.existsSync(inboxPath)) {
    fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
    fs.writeFileSync(inboxPath, "---\ntype: inbox\n---\n\n# Inbox\n\n", "utf8");
  }

  // Query everything in parallel
  const [allPending, projects, areas] = await Promise.all([
    getPendingTasks(db),
    listProjects(db),
    listAreas(db),
  ]);

  // Build lookup maps
  const projectMap = new Map<number, Project>();
  for (const p of projects) projectMap.set(p.id, p);

  const areaMap = new Map<number, Area>();
  for (const a of areas) areaMap.set(a.id, a);

  // Group tasks
  const inboxTasks: DbTask[] = [];
  const projectBuckets = new Map<number, DbTask[]>();
  const areaBuckets = new Map<number, DbTask[]>();
  const otherTasks: DbTask[] = [];

  for (const task of allPending) {
    if (task.filePath === VAULT_FILES.INBOX && !task.projectId && !task.areaId) {
      inboxTasks.push(task);
    } else if (task.projectId && projectMap.has(task.projectId)) {
      const bucket = projectBuckets.get(task.projectId) ?? [];
      bucket.push(task);
      projectBuckets.set(task.projectId, bucket);
    } else if (task.areaId && !task.projectId && areaMap.has(task.areaId)) {
      const bucket = areaBuckets.get(task.areaId) ?? [];
      bucket.push(task);
      areaBuckets.set(task.areaId, bucket);
    } else {
      otherTasks.push(task);
    }
  }

  // Build groups array
  const groups: TaskGroup[] = [];

  // 1. Inbox group always shown
  groups.push({
    key: "inbox",
    title: "Inbox",
    icon: "inbox",
    tasks: inboxTasks,
  });

  // 2. Project groups sorted by title
  const sortedProjectIds = [...projectBuckets.keys()].sort((a, b) => {
    const pa = projectMap.get(a)!;
    const pb = projectMap.get(b)!;
    return pa.title.localeCompare(pb.title);
  });
  for (const pid of sortedProjectIds) {
    const project = projectMap.get(pid)!;
    groups.push({
      key: `project-${pid}`,
      title: project.title,
      icon: "project",
      href: `/projects/${project.slug}`,
      tasks: projectBuckets.get(pid)!,
    });
  }

  // 3. Area groups sorted by title
  const sortedAreaIds = [...areaBuckets.keys()].sort((a, b) => {
    const aa = areaMap.get(a)!;
    const ab = areaMap.get(b)!;
    return aa.title.localeCompare(ab.title);
  });
  for (const aid of sortedAreaIds) {
    const area = areaMap.get(aid)!;
    groups.push({
      key: `area-${aid}`,
      title: area.title,
      icon: "area",
      href: `/areas/${area.slug}`,
      tasks: areaBuckets.get(aid)!,
    });
  }

  // 4. Other tasks
  if (otherTasks.length > 0) {
    groups.push({
      key: "other",
      title: "Other Tasks",
      icon: "other",
      tasks: otherTasks,
    });
  }

  const timezone = getTimezone(db);
  const today = getTodayInTimezone(timezone);

  return <InboxClient groups={groups} today={today} />;
}
