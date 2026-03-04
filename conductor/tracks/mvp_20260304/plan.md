# Implementation Plan: MVP - Initial Version

**Track ID:** mvp_20260304
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-04
**Status:** [~] In Progress

## Overview

Build the full MVP in 10 phases, starting from project scaffolding and the markdown engine (the heart of the system), through the database layer, backend services, UI, and finally deployment. Core logic (markdown parsing, indexer, server actions) follows TDD per workflow policy.

## Phase 1: Project Setup & Foundation

Bootstrap the Next.js 15 project and establish the development environment.

### Tasks

- [x] Task 1.1: Initialize Next.js 15 (App Router) project with TypeScript strict mode and pnpm
- [x] Task 1.2: Configure Tailwind CSS v4 and install shadcn/ui
- [x] Task 1.3: Set up Vitest with TypeScript support
- [x] Task 1.4: Install core dependencies (better-sqlite3, drizzle-orm, drizzle-kit, gray-matter, zod, date-fns, nanoid, pino, chokidar, next-auth)
- [x] Task 1.5: Define vault directory structure conventions (`Inbox/`, `Projects/`, `Areas/`, `Calendar/`) and create sample vault for development

### Verification

- [ ] Project builds and runs with `pnpm dev`
- [ ] Vitest runs with `pnpm test`

## Phase 2: Markdown Engine

Build the task-line parser and file parser — the heart of the system. TDD required.

### Tasks

- [x] Task 2.1: Define Zod schemas for Task, Project, and Area data models
- [x] Task 2.2: Write tests for task-line parser (Obsidian Tasks emoji format: 📅 due, ✅ done, ⏫🔼🔽 priority, 🔁 recurring, etc.)
- [x] Task 2.3: Implement task-line parser (parse a single `- [ ] task line` with emojis into a Task object)
- [x] Task 2.4: Write tests for task-line serializer
- [x] Task 2.5: Implement task-line serializer (Task object back to Obsidian-compatible task line)
- [x] Task 2.6: Write tests for file parser (frontmatter + body with multiple tasks)
- [x] Task 2.7: Implement file parser using gray-matter + task-line parser
- [x] Task 2.8: Write round-trip tests (parse → serialize → parse yields identical result)
- [x] Task 2.9: Implement file serializer (frontmatter + tasks back to `.md` content)

### Verification

- [ ] All parser/serializer tests pass
- [ ] Round-trip tests confirm lossless conversion

## Phase 3: Database Layer

Set up SQLite schema and the vault indexer. TDD required.

### Tasks

- [x] Task 3.1: Define Drizzle ORM schema (tasks, projects, areas, tags, daily_notes tables)
- [x] Task 3.2: Generate and run initial migration with drizzle-kit
- [x] Task 3.3: Write tests for full vault scan indexer
- [x] Task 3.4: Implement full vault scan — walk vault directory, parse all `.md` files, populate SQLite
- [x] Task 3.5: Write tests for incremental reindex (single file change)
- [x] Task 3.6: Implement incremental reindex — reparse a single file and update SQLite

### Verification

- [ ] Database schema matches data models
- [ ] Full scan indexes sample vault correctly
- [ ] Incremental reindex updates only affected records

## Phase 4: Vault Service & Server Actions

Backend services for reading/writing vault files and exposing CRUD operations. TDD required.

### Tasks

- [x] Task 4.1: Implement vault service (read file, write file, list directory, create file, delete file)
- [x] Task 4.2: Write tests for task CRUD server actions
- [x] Task 4.3: Implement server actions: create task, update task, complete task, delete task
- [x] Task 4.4: Write tests for inbox quick-capture action
- [x] Task 4.5: Implement inbox quick-capture server action (append task to `Inbox/inbox.md`)
- [x] Task 4.6: Implement project and area listing queries (Drizzle)
- [x] Task 4.7: Implement task queries — by project, by area, by status, by due date

### Verification

- [ ] All server action tests pass
- [ ] CRUD operations correctly modify `.md` files and update SQLite index

## Phase 5: Core Web UI

Build the main application layout and task management views.

### Tasks

- [x] Task 5.1: Create app layout — sidebar navigation (Inbox, Projects, Areas, Today, Calendar) + main content area
- [x] Task 5.2: Build task component — checkbox, title, due date, priority badge, edit/delete actions
- [x] Task 5.3: Build Inbox view — task list + quick-capture input at top
- [x] Task 5.4: Build Projects list view — cards/list of all projects with task counts
- [x] Task 5.5: Build Project detail view — project info + task list with add task
- [x] Task 5.6: Build Areas list view — cards/list of all areas with task counts
- [x] Task 5.7: Build Area detail view — area info + task list with add task
- [x] Task 5.8: Build task edit modal/drawer — edit title, due date, priority, notes

### Verification

- [ ] All views render correctly with sample vault data
- [ ] Task CRUD works end-to-end through the UI

## Phase 6: Daily Planning

Interactive daily planning ritual with daily note creation.

### Tasks

- [x] Task 6.1: Define daily note `.md` format for `Calendar/` directory
- [x] Task 6.2: Implement daily note server actions (create, read, update daily note)
- [x] Task 6.3: Build daily planning UI — show overdue + due today tasks, let user curate today's list
- [x] Task 6.4: Build Today view — display curated daily task list with completion tracking
- [x] Task 6.5: Build Calendar view — month/week overview with daily note links

### Verification

- [ ] Daily planning creates correct `.md` file in `Calendar/`
- [ ] Today view reflects curated tasks
- [ ] Calendar navigates to daily notes

## Phase 7: Advanced UI Features

Search, filtering, drag-and-drop, tags, recurring tasks, and mobile responsiveness.

### Tasks

- [x] Task 7.1: Implement search — full-text search across task titles and notes
- [x] Task 7.2: Implement filtering — by status, priority, due date, tags
- [x] Task 7.3: Implement drag-and-drop task reordering (persist order in `.md` files)
- [x] Task 7.4: Build tags/labels UI — display tags, filter by tag, add/remove tags from tasks
- [x] Task 7.5: Implement recurring task logic — generate next occurrence on completion
- [x] Task 7.6: Make all views mobile-responsive with Tailwind breakpoints

### Verification

- [ ] Search returns relevant results
- [ ] Filters narrow task lists correctly
- [ ] Drag-and-drop persists order
- [ ] Recurring tasks regenerate correctly
- [ ] UI is usable on mobile viewport sizes

## Phase 8: Real-time Sync & File Watching

Detect vault changes from Obsidian Sync and keep the index up-to-date.

### Tasks

- [ ] Task 8.1: Set up Chokidar file watcher on vault directory
- [ ] Task 8.2: Wire file change events to incremental reindex
- [ ] Task 8.3: Implement write conflict handling — last-write-wins with full reindex fallback
- [ ] Task 8.4: Add UI indicator for sync status (watching / reindexing / error)

### Verification

- [ ] Modifying a `.md` file externally triggers reindex
- [ ] UI reflects changes from sync within seconds
- [ ] No data loss on concurrent writes

## Phase 9: Authentication

Secure the app with NextAuth.js for solo-user access.

### Tasks

- [ ] Task 9.1: Configure NextAuth.js with credentials provider
- [ ] Task 9.2: Create login page
- [ ] Task 9.3: Protect all routes with authentication middleware
- [ ] Task 9.4: Add passkey/WebAuthn support as alternative login method

### Verification

- [ ] Unauthenticated users are redirected to login
- [ ] Credentials login works
- [ ] All API routes and server actions are protected

## Phase 10: Docker & Deployment

Containerize the app with Obsidian Headless Sync.

### Tasks

- [ ] Task 10.1: Create Dockerfile for the Next.js application
- [ ] Task 10.2: Create Docker Compose config with Next.js + obsidian-headless services
- [ ] Task 10.3: Configure shared volume for the vault between services
- [ ] Task 10.4: Add environment variable configuration (.env.example, docs)
- [ ] Task 10.5: Test full stack locally with Docker Compose

### Verification

- [ ] `docker compose up` starts both services
- [ ] Vault syncs via obsidian-headless
- [ ] Web app reads/writes to shared vault
- [ ] App accessible on configured port

## Final Verification

- [ ] All acceptance criteria met
- [ ] Tests passing (`pnpm test`)
- [ ] Full Docker deployment works end-to-end
- [ ] `.md` files are Obsidian-compatible (verified in Obsidian)
- [ ] Cross-device sync works via Obsidian Headless
- [ ] Documentation updated

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
