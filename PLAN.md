# Obsidian-Backed Todo/Project Management System

## Context

Obsidian released a headless sync CLI tool (`obsidian-headless`) that syncs vault files without the GUI. This unlocks building a feature-rich web app for personal task/project management that stores everything as `.md` files — fully compatible with Obsidian on all devices. The web app is the primary product; mobile/Mac apps are a future possibility.

## How It Works

- **`ob sync --continuous`** runs as a daemon on a self-hosted Linux server, syncing a local vault directory to Obsidian's cloud
- **Next.js** serves the web UI and reads/writes `.md` files directly in the vault directory
- **SQLite** acts as a derived index (not source of truth) for fast queries
- **Chokidar** watches for file changes from sync and triggers re-indexing
- Changes made via the app are picked up by `ob sync` and pushed to all Obsidian devices

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15** (App Router) | Rich web UI + Server Components + Server Actions |
| Language | TypeScript (strict) | Type safety for parsing/API contracts |
| Package Manager | pnpm | User preference |
| UI | **Tailwind CSS v4 + shadcn/ui** | Customizable component library, great for productivity apps |
| Validation | Zod | Shared schemas for actions + markdown parsing |
| Database | SQLite via `better-sqlite3` + Drizzle ORM | Derived index, fully rebuildable from vault |
| File Watching | Chokidar v4 | Reliable cross-platform, `awaitWriteFinish` for sync safety |
| Markdown | `gray-matter` (frontmatter) + custom task-line parser | Lightweight, focused on task extraction |
| Auth | NextAuth.js with simple credentials or passkey | Solo user, but proper auth for a web app exposed on a server |
| Testing | vitest | Fast, TypeScript-native |
| Deployment | Self-hosted Linux server (Docker Compose) | Next.js container + ob sync container, shared vault volume |

## Architecture

```
  Obsidian Mobile/Desktop
         |
    Obsidian Sync Cloud
         |
  ob sync --continuous (Docker container)
         |
    Vault Directory (.md files) ← Source of Truth ← Shared Docker Volume
         |
  Next.js App (Docker container)
    ├── Server Components → read SQLite index (fast queries)
    ├── Server Actions → read/write .md files → update SQLite
    ├── Chokidar watcher → re-index on external changes
    └── /api/* routes (future: mobile/Mac clients)
```

**Key insight:** Server Components and Server Actions access the engine/index code directly — no HTTP overhead. The web UI never goes through API routes. API routes are only added later for external clients.

## Vault Directory Structure

```
vault/
  _system/                       # App config + templates
    templates/
      project.md
    config.md

  Inbox/
    inbox.md                     # Quick-capture one-off tasks

  Projects/
    My Project/
      My Project.md              # Project file (frontmatter + tasks)
      Research Notes.md          # Notes linked by being in the folder
    Another Project/
      Another Project.md

  Areas/                         # Ongoing areas (Health, Finances) — no end date
    Health/
      Health.md

  Archive/                       # Completed projects move here
    Old Project/

  Calendar/                      # Optional daily notes
    2026/
      2026-03-04.md
```

**Projects are folders** so notes can live alongside them. Inbox is a single file. Areas are separate from projects.

## Task Format (Obsidian Tasks Emoji Format)

```markdown
- [ ] Task description ⏫ 🛫 2026-03-08 📅 2026-03-15 🔁 every week ➕ 2026-03-01
- [x] Done task ✅ 2026-03-14
- [/] In progress task
- [-] Cancelled task ❌ 2026-03-05
- [>] Deferred task
```

- **Dates:** `📅` due, `⏳` scheduled, `🛫` start, `➕` created, `✅` done, `❌` cancelled
- **Priority:** `🔺` highest, `⏫` high, `🔼` medium, `🔽` low, `⏬` lowest
- **Dependencies:** `🆔 abc123` (defines ID), `⛔ abc123` (blocked by)
- **Recurrence:** `🔁 every week on Monday`

**Project frontmatter:**
```yaml
---
type: project
status: active
area: work
tags: [client-acme]
due: 2026-04-15
priority: high
---
```

## Source Code Structure

```
my-own-todo-app/
  package.json
  next.config.ts
  drizzle.config.ts
  .env.local                     # VAULT_PATH, AUTH_SECRET, etc.
  tailwind.config.ts
  components.json                # shadcn/ui config

  src/
    app/                         # Next.js App Router
      layout.tsx                 # Root layout with sidebar navigation
      page.tsx                   # Today view (daily planner or curated list)
      plan/page.tsx              # "Plan Your Day" interactive selection
      inbox/page.tsx             # Inbox view
      projects/
        page.tsx                 # Projects list
        [id]/page.tsx            # Single project view
      upcoming/page.tsx          # Upcoming tasks view
      search/page.tsx            # Search view
      settings/page.tsx          # Settings
      api/                       # Future: REST API for mobile clients
        [...]route.ts

    lib/
      engine/                    # Markdown engine (heart of the system)
        task-line-parser.ts      # Parse single task line (regex + emoji)
        task-line-serializer.ts  # Serialize task line back
        file-parser.ts           # Parse full .md file (frontmatter + tasks)
        file-serializer.ts       # Write back preserving non-task content
        types.ts                 # ParsedTask, ParsedProject, etc.

      db/                        # SQLite index
        schema.ts                # Drizzle schema (projects, tasks, notes)
        index.ts                 # Connection + migrations
        queries.ts               # Reusable query functions

      vault/                     # File system operations
        vault-service.ts         # Read/write/move files, create projects
        file-lock.ts             # Per-file mutex for conflict prevention
        indexer.ts               # Full scan + incremental re-index
        watcher.ts               # Chokidar setup, file change handler

      actions/                   # Server Actions
        task-actions.ts          # createTask, completeTask, updateTask, deleteTask
        project-actions.ts       # createProject, archiveProject, etc.
        inbox-actions.ts         # quickCapture, triageTask
        daily-actions.ts         # planDay, addToDay, completeDaily, rolloverTasks

    components/
      ui/                        # shadcn/ui components
      tasks/
        task-list.tsx            # Task list component
        task-item.tsx            # Single task row (checkbox, dates, priority)
        task-form.tsx            # Create/edit task form
        task-filters.tsx         # Filter bar (status, priority, date range)
      projects/
        project-card.tsx         # Project summary card
        project-sidebar.tsx      # Project list in sidebar
      layout/
        sidebar.tsx              # Main navigation sidebar
        command-palette.tsx      # Cmd+K quick actions
        header.tsx
      daily/
        day-planner.tsx          # Interactive task selection (Plan Your Day)
        daily-task-list.tsx      # Curated daily task list
        rollover-dialog.tsx      # End-of-day rollover prompt
      inbox/
        quick-capture.tsx        # Quick task input (always visible)
```

## Daily Planning Workflow (Core Feature)

The "Today" view is NOT a passive filter — it's built through an **interactive daily planning ritual**.

### How It Works

1. **Start of day:** User opens the app and sees a "Plan Your Day" screen (if no daily plan exists for today)
2. **Task candidates are shown**, grouped by source:
   - **Recurring tasks** (auto-selected, checked by default)
   - **Overdue tasks** (highlighted, suggested but not auto-selected)
   - **Tasks due today** (suggested)
   - **Tasks from each active project** (expandable sections, user picks what to work on)
   - **Inbox items** (user can pull in one-off tasks)
3. **User selects tasks** via checkboxes, building their daily to-do list interactively
4. **"Start My Day" button** commits the selection → creates a daily note `.md` file in `Calendar/2026/2026-03-04.md` with references to the selected tasks
5. **Today tab** becomes the main workspace showing only the curated daily list

### Daily Note File Format

File: `Calendar/2026/2026-03-04.md`
```markdown
---
type: daily
date: 2026-03-04
planned: true
---

# Tuesday, March 4, 2026

## Today's Tasks

- [ ] Morning workout 🔁 every day 🔼
- [ ] Review PR for client project ⏫ 📅 2026-03-04
- [ ] Draft proposal for website redesign 📅 2026-03-06
- [ ] Buy groceries 🔽
- [ ] Call dentist to reschedule

## Notes

_Free-form area for daily journal / notes_
```

### Today Tab Behavior

- **Before planning:** Shows "Plan Your Day" interactive selection screen
- **After planning:** Shows the curated daily task list with checkboxes to mark done
- **Completing a task** in the Today view also marks it done in the source project file
- **Tasks can be added mid-day** via a quick-add within the Today view
- **End of day:** Uncompleted tasks can be rolled over to tomorrow or sent back to their projects

### Storage Model

Daily tasks are **copied** (not referenced) into the daily note. When a task is completed in the daily note, the Server Action also updates the original task in the project file — changing `[ ]` to `[x]` AND adding `✅ YYYY-MM-DD` for full Obsidian Tasks compatibility. This keeps the daily note self-contained and readable in Obsidian, while maintaining the source of truth in project files.

The SQLite `daily_tasks` table tracks the mapping:
```
daily_tasks: id, dailyDate, taskId (FK to tasks), sourceFilePath, sourceLineNumber,
             status, addedAt, completedAt
```

## Key UI Views

1. **Today** (default) — Interactive daily planner → curated daily task list
2. **Inbox** — Unsorted quick-capture tasks, triage to projects
3. **Projects** — Grid/list of active projects with progress indicators
4. **Project Detail** — All tasks, notes, subtasks for one project
5. **Upcoming** — Next 7/14/30 day timeline view
6. **Search** — Full-text search across tasks and notes
7. **Command Palette** — Cmd+K for quick task capture, navigation, actions

## SQLite Schema (Drizzle)

```typescript
projects: id, name, filePath, type ('project'|'area'), status, area, priority,
          dueDate, tags (JSON), createdAt, updatedAt, fileHash

tasks:    id, projectId (FK), filePath, lineNumber, indent, parentTaskId,
          description, status, priority, dueDate, scheduledDate, startDate,
          createdDate, doneDate, cancelledDate, recurrence, taskIdentifier,
          dependsOn (JSON), tags (JSON), fileHash

notes:    id, title, filePath, projectId (FK), tags (JSON), createdAt, fileHash

daily_tasks: id, dailyDate (YYYY-MM-DD), taskId (FK), sourceFilePath,
             sourceLineNumber, status, addedAt, completedAt
```

Plus FTS5 virtual table for full-text search.

**The DB is fully rebuildable** from the vault at any time. It is a cache, not the source of truth.

## Read/Write Flows

**Reading (Server Component):**
Server Component → calls query function → Drizzle queries SQLite → returns data → renders UI. Never reads .md files on the read path.

**Writing (Server Action):**
Server Action → look up task in SQLite (get filePath + lineNumber) → read .md file → modify target line → write .md → update SQLite → `ob sync` pushes to cloud → revalidate UI.

**External change (Obsidian edits via sync):**
`ob sync` writes .md → Chokidar detects → re-index changed file in SQLite → connected clients see updated data on next request.

## Conflict Resolution

- **Per-file mutex** prevents concurrent writes to the same file
- **Hash check** before write: re-read if file changed since last read
- **Obsidian Sync** handles cloud conflicts (creates `*.conflict.md`)
- Solo user = conflicts are extremely rare in practice

## Deployment (Docker Compose)

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    volumes:
      - vault-data:/vault
      - db-data:/data/db
    environment:
      - VAULT_PATH=/vault
      - DATABASE_PATH=/data/db/index.sqlite

  obsidian-sync:
    image: node:22
    command: ob sync --continuous
    volumes:
      - vault-data:/vault
    environment:
      - OBSIDIAN_AUTH_TOKEN=${OBSIDIAN_AUTH_TOKEN}

volumes:
  vault-data:
  db-data:
```

Both containers share the `vault-data` volume. The Next.js app reads/writes .md files; `ob sync` keeps them synced to Obsidian's cloud.

## Feature Phases

### Phase 1: Core MVP
- Project scaffold (Next.js 15, Tailwind, shadcn/ui, Drizzle, pnpm)
- Markdown engine: task-line parser/serializer (round-trip safe, TDD)
- File parser/serializer (frontmatter + task extraction)
- SQLite schema + full-scan indexer + Chokidar watcher
- Vault service (read/write with file locking)
- Server Actions: task CRUD, project CRUD, inbox quick capture
- UI: Today view, Inbox, Project list, Project detail, Task components
- Sidebar navigation + Command palette (Cmd+K)
- Basic auth (protect the server)
- Docker Compose deployment config

### Phase 2: Enhanced Productivity
- Recurring tasks (parse `🔁`, generate next on completion)
- Task dependencies (`🆔`/`⛔` fields)
- Areas of responsibility
- Upcoming view (timeline), Review view (stale tasks)
- Full-text search (FTS5)
- Move tasks between projects, archive projects
- Notes viewer (render project notes as markdown)
- Tags filtering, bulk actions
- Drag-and-drop task reordering

### Phase 3: Integrations
- Calendar sync (CalDAV — Google Calendar, Apple Calendar)
- Telegram bot (grammy — quick capture, daily summaries, task completion)
- Scheduled reminders/notifications

### Phase 4: Intelligence
- Natural language task input ("buy milk tomorrow")
- AI task breakdown (subtask suggestions)
- Smart scheduling, weekly review generator
- Habit tracking, focus mode

## Implementation Order (Phase 1)

1. **Project scaffold** — `pnpm create next-app`, shadcn/ui init, Drizzle config, env setup
2. **Engine: task-line parser + serializer** — TDD, extensive edge cases, round-trip safe
3. **Engine: file parser + serializer** — Full .md file handling, line-level modification
4. **SQLite schema + indexer** — Drizzle schema, full-scan indexer, hash-based change detection
5. **Chokidar watcher + vault service** — File watching, read/write with locking
6. **Server Actions** — Task CRUD, project CRUD, inbox capture
7. **UI: Layout + Sidebar** — App shell, navigation, command palette
8. **UI: Today view + Task components** — Task list, task item, filters
9. **UI: Inbox + Projects** — Inbox view, project list, project detail
10. **Auth + Docker Compose** — Protect the app, deployment config

## Verification

- `pnpm test` — Unit tests for parser/serializer, indexer, server actions
- Manual: Create task via UI → check `Inbox/inbox.md` has the task line
- Manual: Edit a .md file in vault → verify UI reflects the change
- Round-trip: parse every .md file, serialize, parse again — output must match
- Docker Compose: `docker compose up` → verify app + sync both running, sharing vault
