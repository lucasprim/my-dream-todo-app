# Product Definition - My Dream Todo App

## Project Name

My Dream Todo App

## Description

A feature-rich personal productivity web app that stores tasks as Obsidian-compatible markdown files, synced across all devices via Obsidian Headless Sync.

## Problem Statement

Existing todo apps lock your data in proprietary formats, don't integrate with knowledge management tools like Obsidian, and lack the flexibility to build a truly personalized productivity workflow.

## Target Users

Obsidian power users who want a dedicated task management UI.

## Key Goals

1. **Data ownership via markdown files** - All data lives in plain-text `.md` files in an Obsidian vault. No vendor lock-in, full portability.
2. **Rich web UI rivaling Things 3 / Todoist** - Beautiful, fast, and delightful to use. Interactive daily planning, project management, quick capture.
3. **Seamless cross-device sync** - Changes sync to all Obsidian devices via Obsidian Headless Sync. Edit tasks on the web, see them in Obsidian mobile, and vice versa.

## Core Concepts

- **Vault** - An Obsidian vault directory containing all project files, tasks, and notes as `.md` files. This is the source of truth.
- **Projects** - Folders containing a primary `.md` file with tasks and optional related notes. Have a defined scope and end date.
- **Areas** - Ongoing areas of responsibility (Health, Finances) with no end date. Same structure as projects.
- **Inbox** - A single file (`Inbox/inbox.md`) for quick-capture tasks awaiting triage.
- **Daily Plan** - An interactive daily planning ritual where the user curates their task list for the day. Creates a daily note in `Calendar/`.
- **SQLite Index** - A derived database that caches vault content for fast queries. Fully rebuildable from the vault at any time.
