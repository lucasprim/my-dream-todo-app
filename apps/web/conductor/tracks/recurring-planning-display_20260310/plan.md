# Implementation Plan: Recurring Tasks in Planning Mode

**Track ID:** recurring-planning-display_20260310
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-10
**Status:** In Progress

## Overview

Four focused code changes across the query layer and the Today page component tree. No schema changes or new dependencies required.

## Phase 1: Recurring Tasks Smart Display

### Tasks

- [x] Task 1.1: Add `getRecurringDueTasks(db, today)` to `src/db/queries/index.ts` and modify `getAvailableTasksForPlanning` to exclude recurring tasks that have a dueDate
- [x] Task 1.2: Wire `getRecurringDueTasks` into `src/app/today/page.tsx` (Promise.all + TodayClient prop)
- [x] Task 1.3: Thread `recurringDueTasks: AvailableTask[]` prop through `src/app/today/today-client.tsx` to PlanningMode
- [x] Task 1.4: Add teal suggestion section, `handleAddAllRecurring` handler, and `getRelativeDueLabel` helper to `src/app/today/planning-mode.tsx`

### Verification

- [ ] Recurring task with dueDate = today appears in teal section, not in Available Tasks
- [ ] Recurring task with dueDate < today appears in teal section with "X days overdue" label
- [ ] Recurring task with dueDate > today is absent from both panels
- [ ] Recurring task with no dueDate still appears in Available Tasks
- [ ] "Add all to today" and individual + buttons work correctly
- [ ] Carry-forward (amber) section unchanged

## Final Verification

- [ ] All acceptance criteria met
- [ ] No TypeScript errors
- [ ] Ready for review
