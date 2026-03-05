# Implementation Plan: People Management

**Track ID:** people-management_20260304
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-04
**Status:** [ ] Not Started

## Overview

Add people management by: (1) extending the parser to extract `[[@Name]]` mentions, (2) adding `people` and `task_people` tables, (3) indexing people from the vault `People/` folder and from task mentions, (4) building a people directory and detail pages, and (5) adding `@` mention autocomplete to task inputs.

## Phase 1: Parsing & Data Model

Extend the markdown engine and database schema to support people references.

### Tasks

- [x] Task 1.1: Add `[[@Person Name]]` regex extraction to `task-line-parser.ts` — populate a `mentions: string[]` field on the parsed Task type
- [x] Task 1.2: Update `schemas.ts` — add `mentions?: string[]` to the Task type
- [x] Task 1.3: Update `serializeTaskLine()` in `task-line-serializer.ts` to preserve `[[@Name]]` references in serialized output (no changes needed — mentions are inline text kept in the title)
- [x] Task 1.4: Add `people` table to Drizzle schema (`id`, `slug`, `name`, `filePath?`, `email?`, `company?`, `updatedAt`)
- [x] Task 1.5: Add `taskPeople` join table to Drizzle schema (`taskId` FK, `personId` FK)
- [x] Task 1.6: Generate and run Drizzle migration
- [x] Task 1.7: Write tests for mention parsing (round-trip: parse → serialize → parse)

### Verification

- [ ] `parseTaskLine("- [ ] Follow up with [[@Roberto Almeida]]")` returns `mentions: ["Roberto Almeida"]`
- [ ] `serializeTaskLine(task)` preserves `[[@Roberto Almeida]]` in output
- [ ] Database tables created with correct schema

## Phase 2: Indexing

Extend the vault indexer to discover people from `People/` folder and link mentions to the `task_people` table.

### Tasks

- [x] Task 2.1: Add `"people"` file type to `classifyFile()` for files in `People/` directory
- [x] Task 2.2: Add `VAULT_DIR_PEOPLE` to `vault-config.ts` (default: `"People"`)
- [x] Task 2.3: In `indexFile()`, handle `"people"` type — parse frontmatter (name, email, company), upsert into `people` table
- [x] Task 2.4: After indexing tasks, extract `mentions` array and upsert `task_people` join rows (resolve person name → personId, auto-create person if not in `People/` folder)
- [x] Task 2.5: Write tests for people indexing and mention linking

### Verification

- [ ] Full vault scan discovers people from `People/` folder
- [ ] Tasks with `[[@Name]]` create correct `task_people` rows
- [ ] Mentions of people not in `People/` folder auto-create a person record

## Phase 3: Queries & Server Actions

Add query functions and server actions for people data.

### Tasks

- [ ] Task 3.1: Add query `listPeople(db)` — all people ordered by name, with task count
- [ ] Task 3.2: Add query `getPersonBySlug(db, slug)` — single person with details
- [ ] Task 3.3: Add query `getTasksByPerson(db, personId)` — tasks mentioning a person, with project/area info
- [ ] Task 3.4: Add query `searchPeople(db, query)` — search people by name (for autocomplete)
- [ ] Task 3.5: Create server action `searchPeopleAction(query)` for client-side autocomplete

### Verification

- [ ] Queries return correct data with proper joins
- [ ] Search action returns matching people for partial name input

## Phase 4: People UI Pages

Build the people directory and detail pages.

### Tasks

- [ ] Task 4.1: Add "People" link to sidebar navigation
- [ ] Task 4.2: Create `/people` page — server component fetching `listPeople()`, rendering a list of people with task counts
- [ ] Task 4.3: Create `/people/[slug]` page — server component fetching person details and their tasks, grouped by project/area
- [ ] Task 4.4: Create `PersonCard` component for the people list
- [ ] Task 4.5: Reuse `TaskItem` component on person detail page to display linked tasks

### Verification

- [ ] `/people` shows all people with task counts
- [ ] `/people/[slug]` shows person details and grouped tasks
- [ ] Sidebar navigation includes People link

## Phase 5: @ Mention Autocomplete

Add an interactive `@` mention autocomplete to task input fields.

### Tasks

- [ ] Task 5.1: Create `MentionAutocomplete` component — listens for `@` keystrokes, shows dropdown of matching people from `searchPeopleAction()`, inserts `[[@Name]]` on selection
- [ ] Task 5.2: Integrate `MentionAutocomplete` into `QuickCapture` component
- [ ] Task 5.3: Integrate `MentionAutocomplete` into `TaskEditModal` component
- [ ] Task 5.4: Style the autocomplete dropdown to match existing UI (shadcn/ui patterns)

### Verification

- [ ] Typing `@` in task input shows people suggestions
- [ ] Selecting a person inserts `[[@Person Name]]` into the input
- [ ] Works in both QuickCapture and TaskEditModal

## Final Verification

- [ ] All acceptance criteria met
- [ ] Tests passing (`pnpm test`)
- [ ] People pages render correctly
- [ ] `[[@Name]]` references round-trip correctly through parse → edit → serialize → reindex
- [ ] Obsidian compatibility: `[[@Name]]` links work in Obsidian too

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
