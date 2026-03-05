"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Inbox,
  Layers,
  Calendar,
  Star,
  CheckSquare,
  Search,
  Menu,
  X,
  Settings,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Users,
} from "lucide-react";
import { SyncIndicator } from "./sync-indicator";
import type { Project, Area, Person } from "@/db/schema";
import { createProjectAction, createAreaAction } from "@/app/actions/project-area-actions";
import { createPersonAction } from "@/app/actions/people-actions";

const TOP_NAV = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: Star },
] as const;

const BOTTOM_NAV = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function InlineCreate({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (title: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    await onSubmit(value.trim());
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 py-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        placeholder={placeholder}
        disabled={saving}
        className="w-full rounded border border-sidebar-accent bg-transparent px-2 py-1 text-xs outline-none placeholder:text-sidebar-foreground/40"
      />
    </form>
  );
}

function CollapsibleSection({
  label,
  icon: Icon,
  items,
  basePath,
  pathname,
  onNavigate,
  createPlaceholder,
  onCreate,
}: {
  label: string;
  icon: React.ElementType;
  items: { slug: string; title: string }[];
  basePath: string;
  pathname: string;
  onNavigate?: () => void;
  createPlaceholder: string;
  onCreate: (title: string) => Promise<void>;
}) {
  const isActive = pathname.startsWith(basePath);
  const [open, setOpen] = useState(isActive || items.length > 0);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreate = async (title: string) => {
    await onCreate(title);
    setCreating(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{label}</span>
          {open ? (
            <ChevronDown className="h-3 w-3 opacity-50" />
          ) : (
            <ChevronRight className="h-3 w-3 opacity-50" />
          )}
        </button>
        <button
          onClick={() => { setOpen(true); setCreating(true); }}
          className="mr-1 rounded p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
          title={`New ${label.slice(0, -1)}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="ml-3 space-y-0.5 border-l border-sidebar-accent/30 pl-2">
          {items.map((item) => {
            const href = `${basePath}/${item.slug}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.slug}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-xs transition-colors truncate",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                )}
              >
                {item.title}
              </Link>
            );
          })}

          {creating && (
            <InlineCreate
              placeholder={createPlaceholder}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
            />
          )}

          {!creating && items.length === 0 && (
            <p className="px-2 py-1 text-xs text-sidebar-foreground/40 italic">
              None yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface SidebarContentProps {
  pathname: string;
  projects: Project[];
  areas: Area[];
  people: { slug: string; title: string }[];
  onNavigate?: () => void;
}

function SidebarContent({ pathname, projects, areas, people, onNavigate }: SidebarContentProps) {
  const router = useRouter();

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
      {TOP_NAV.map(({ href, label, icon }) => (
        <NavLink key={href} href={href} label={label} icon={icon} pathname={pathname} onNavigate={onNavigate} />
      ))}

      <div className="my-1" />

      <CollapsibleSection
        label="Projects"
        icon={FolderOpen}
        items={projects}
        basePath="/projects"
        pathname={pathname}
        onNavigate={onNavigate}
        createPlaceholder="Project name…"
        onCreate={async (title) => {
          const slug = await createProjectAction({ title });
          router.push(`/projects/${slug}`);
        }}
      />

      <CollapsibleSection
        label="Areas"
        icon={Layers}
        items={areas}
        basePath="/areas"
        pathname={pathname}
        onNavigate={onNavigate}
        createPlaceholder="Area name…"
        onCreate={async (title) => {
          const slug = await createAreaAction({ title });
          router.push(`/areas/${slug}`);
        }}
      />

      <CollapsibleSection
        label="People"
        icon={Users}
        items={people}
        basePath="/people"
        pathname={pathname}
        onNavigate={onNavigate}
        createPlaceholder="Person name…"
        onCreate={async (title) => {
          const slug = await createPersonAction({ name: title });
          router.push(`/people/${slug}`);
        }}
      />

      <div className="my-1" />

      {BOTTOM_NAV.map(({ href, label, icon }) => (
        <NavLink key={href} href={href} label={label} icon={icon} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

interface SidebarProps {
  projects: Project[];
  areas: Area[];
  people: (Person & { taskCount: number })[];
}

export function Sidebar({ projects, areas, people }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const peopleItems = people.map((p) => ({ slug: p.slug, title: p.name }));

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex h-screen w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 py-5 font-semibold">
          <CheckSquare className="h-5 w-5" />
          <span>My Tasks</span>
        </div>
        <SidebarContent pathname={pathname} projects={projects} areas={areas} people={peopleItems} />
        <SyncIndicator />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 font-semibold">
          <CheckSquare className="h-5 w-5" />
          <span>My Tasks</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 rounded-md hover:bg-sidebar-accent/50"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="w-64 flex flex-col bg-sidebar text-sidebar-foreground border-l h-full">
            <div className="flex items-center justify-between px-4 py-5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckSquare className="h-5 w-5" />
                <span>My Tasks</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md hover:bg-sidebar-accent/50"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              projects={projects}
              areas={areas}
              people={peopleItems}
              onNavigate={() => setMobileOpen(false)}
            />
            <SyncIndicator />
          </aside>
        </div>
      )}
    </>
  );
}
