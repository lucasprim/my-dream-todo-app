# Implementation Plan: Today — Daily Planning

**Track ID:** today_20260305
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-05
**Status:** [~] In Progress

## Overview

Enhance the existing `/today` page into a dual-mode daily planning hub. **Planning Mode** lets the user curate their day — picking tasks from projects/areas/inbox, carrying forward unfinished work, and reordering priorities. **Focus Mode** is the post-planning experience — a clean, minimal task list for execution. The user can switch back to Planning Mode at any time to re-plan. The daily note (`Calendar/YYYY-MM-DD.md`) tracks the plan and whether planning is complete.

## Phase 1: Foundation — Queries, Actions & Tests

Build the data layer for daily planning: new queries, server actions for scheduling, and a "plan status" concept in the daily note.

### Tasks

- [x] Task 1.1: Add `getTasksScheduledForDate(db, date)` query — returns uncompleted tasks where `scheduledDate = date`, ordered by line number
- [x] Task 1.2: Add `getCarryForwardTasks(db, today)` query — returns uncompleted tasks where `scheduledDate < today` (unfinished from previous days)
- [x] Task 1.3: Add `getAvailableTasksForPlanning(db, date)` query — returns uncompleted tasks NOT already scheduled for `date`, grouped by source (inbox/project/area)
- [x] Task 1.4: Add `scheduleTaskForDateAction(taskId, date)` server action — sets `scheduledDate` (⏳ emoji) on the task in both `.md` file and DB
- [x] Task 1.5: Add `unscheduleTaskAction(taskId)` server action — clears `scheduledDate` from `.md` file and DB
- [x] Task 1.6: Add `finishPlanningAction(date)` and `reopenPlanningAction(date)` server actions — update daily note frontmatter `planned: true/false`
- [x] Task 1.7: Write tests for new queries and actions

### Verification

- [ ] All new queries return correct results against test data
- [ ] Schedule/unschedule actions correctly update both `.md` files and SQLite
- [ ] Planning status persists in daily note frontmatter

## Phase 2: Focus Mode — The Post-Planning Experience

Build the clean, minimal execution view that the user lives in after planning. This is the primary daily experience.

### Tasks

- [x] Task 2.1: Redesign `TodayClient` with mode awareness — render Focus Mode when `planned: true` for today
- [x] Task 2.2: Build Focus Mode UI — single clean task list showing today's planned tasks in order, with completion checkboxes and progress indicator (e.g., "3 of 7 done")
- [x] Task 2.3: Add inline task completion with optimistic UI (reuse existing `TaskItem`)
- [x] Task 2.4: Add "Re-plan" button that switches back to Planning Mode (calls `reopenPlanningAction`)
- [x] Task 2.5: Show congratulatory empty state when all tasks are completed
- [x] Task 2.6: Quick capture in Focus Mode — add an urgent task directly to today's plan without leaving Focus Mode

### Verification

- [ ] Focus Mode shows only today's planned tasks in a clean list
- [ ] Tasks can be completed inline with progress tracking
- [ ] Re-plan button transitions to Planning Mode
- [ ] Quick capture works without leaving Focus Mode

## Phase 3: Planning Mode — Task Curation Experience

Build the full planning experience: carry-forward, task picker, reordering, and "Done planning" transition.

### Tasks

- [x] Task 3.1: Build Planning Mode layout — split view with "Today's Plan" (left/top) and "Available Tasks" browser (right/bottom)
- [x] Task 3.2: Build carry-forward banner at top of Planning Mode — show unfinished tasks from previous days with "Add all to today" and per-task "Add" / "Dismiss" actions
- [x] Task 3.3: Build task browser with sections: Inbox, Projects (collapsible per project), Areas (collapsible per area) — fetch via `getAvailableTasksForPlanning`
- [x] Task 3.4: Add search/filter within the task browser (client-side filter by title)
- [x] Task 3.5: "Add to plan" action per task — calls `scheduleTaskForDateAction`, task moves from browser to plan
- [x] Task 3.6: "Remove from plan" action — calls `unscheduleTaskAction`, task moves back to browser
- [x] Task 3.7: Drag-and-drop reordering within "Today's Plan" (reuse `SortableTaskList` + `reorderTasksAction`)
- [x] Task 3.8: "Done planning" button — calls `finishPlanningAction`, transitions to Focus Mode

### Verification

- [ ] Planning Mode shows plan and available tasks side by side
- [ ] Carry-forward surfaces previous unfinished tasks
- [ ] Tasks move between browser and plan fluidly
- [ ] Reordering works via drag-and-drop
- [ ] "Done planning" transitions to Focus Mode

## Phase 4: Daily Note Integration

Auto-generate the daily note when the plan changes so it stays in sync with the Obsidian vault.

### Tasks

- [ ] Task 4.1: Auto-create/update `Calendar/YYYY-MM-DD.md` when tasks are scheduled/unscheduled — write planned task list in `## Tasks` section using Obsidian-compatible format
- [ ] Task 4.2: Update daily note on task completion — mark completed tasks with ✅ in the daily note
- [ ] Task 4.3: Ensure daily note frontmatter includes `planned: true/false` and `date` fields
- [ ] Task 4.4: Handle re-planning — when user re-opens planning, daily note reflects the updated plan

### Verification

- [ ] Daily note file is created/updated with planned tasks in Obsidian-compatible format
- [ ] Completing tasks updates both source file and daily note
- [ ] Re-planning updates the daily note correctly

## Phase 5: Landing Page & Polish

Make Today the default landing page and polish both modes.

### Tasks

- [ ] Task 5.1: Change root `/` redirect from `/inbox` to `/today`
- [ ] Task 5.2: First visit of the day auto-enters Planning Mode (no plan yet); returning visits show Focus Mode
- [ ] Task 5.3: Visual polish — smooth transitions between modes, section headers, progress bar in Focus Mode
- [ ] Task 5.4: Responsive design — mobile-friendly planning (stacked layout) and focus views
- [ ] Task 5.5: Handle edge cases — midnight rollover, empty plan, tasks deleted externally, Obsidian sync conflicts

### Verification

- [ ] App opens to Today page by default
- [ ] Correct mode is shown based on planning state
- [ ] UI is polished and responsive across both modes
- [ ] Edge cases handled gracefully

## Final Verification

- [ ] All acceptance criteria met
- [ ] Tests passing (`pnpm test`)
- [ ] Daily note output is Obsidian-compatible
- [ ] `.md` files use correct ⏳ emoji format for scheduledDate
- [ ] Both Planning and Focus modes work end-to-end
- [ ] Ready for review

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
