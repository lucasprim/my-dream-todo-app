# Specification: Recurring Tasks in Planning Mode

**Track ID:** recurring-planning-display_20260310
**Type:** Enhancement
**Created:** 2026-03-10
**Status:** Draft

## Summary

Improve the Today planning view by surfacing recurring tasks that are due (or overdue) as teal-accented suggestions, while hiding future-dated recurring tasks that would clutter the available tasks panel.

## Context

The Today page planning mode shows a left panel (Available Tasks) and a right panel (Today's Plan). Recurring tasks currently appear in the Available Tasks panel regardless of when they're due, creating noise: a task due next week shows up alongside tasks that need to be done today. Additionally, recurring tasks that ARE due today have no visual distinction — they're buried in the list with no hint that today is the scheduled day.

The right panel already shows an amber "carry-forward" banner for tasks that were previously scheduled but not completed. This feature adds a parallel teal banner for recurring tasks that are due today or overdue by their `dueDate`.

## User Story

As a planner reviewing my day, I want recurring tasks that are due today to appear as prominent suggestions in my Today plan, and I want future-dated recurring tasks hidden from the available tasks list, so I can focus on what actually needs to happen today.

## Acceptance Criteria

- [ ] Recurring tasks with `dueDate <= today` and not yet scheduled appear in a teal suggestion section in the right panel
- [ ] The teal section shows each task's title, relative due label ("due today", "1 day overdue", "N days overdue"), and a + button
- [ ] "Add all to today" button in the teal section schedules all recurring due tasks
- [ ] Recurring tasks with `dueDate > today` are hidden from the Available Tasks panel
- [ ] Recurring tasks with no `dueDate` remain in Available Tasks (unchanged)
- [ ] Carry-forward (amber) section behavior is unchanged
- [ ] Recurring tasks already scheduled for today do not appear in the teal section

## Dependencies

Builds on the completed `today_20260305` (Today — Daily Planning) and `task-recurrence_20260305` (Task Recurrence Patterns) tracks.

## Out of Scope

- Auto-scheduling recurring tasks (user still manually approves each one)
- Showing recurring task history or streaks
- Changes to Focus Mode

## Technical Notes

- New query `getRecurringDueTasks(db, today)` mirrors `getAvailableTasksForPlanning` structure
- `getAvailableTasksForPlanning` gains one extra WHERE exclusion: `NOT (recurrence IS NOT NULL AND dueDate IS NOT NULL)`
- Teal color tokens: `border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30`
