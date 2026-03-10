# Workflow - My Dream Todo App

## TDD Policy

**Moderate** - Tests are encouraged and expected for core logic, but not strictly required before implementation for all code.

### What MUST be tested:
- Markdown engine (task-line parser, serializer, file parser) — this is the heart of the system
- SQLite indexer (full scan, incremental re-index)
- Server Actions (task CRUD, daily planning)

### What SHOULD be tested:
- Query functions (Drizzle queries)
- Vault service (file operations)

### What CAN skip tests:
- UI components (unless complex interactive logic)
- Layout/styling changes
- Configuration files

## Commit Strategy

**Conventional Commits** format:

```
feat: add task completion with done date
fix: handle emoji parsing for multi-byte characters
refactor: extract task-line parser into separate module
test: add round-trip tests for file parser
docs: update vault directory structure
chore: configure Drizzle migrations
```

Prefixes:
- `feat:` — New feature or capability
- `fix:` — Bug fix
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding or updating tests
- `docs:` — Documentation changes
- `chore:` — Build, tooling, or dependency changes

## Code Review

**Self-review OK** - This is a solo project. Review your own diffs before committing. No formal review process required.

## Verification Checkpoints

**At track completion only.** Don't stop to verify after every task — maintain flow and verify when the full feature track is complete.

Verification includes:
- All tests pass (`pnpm test`)
- Manual smoke test of the feature
- Check `.md` file output is Obsidian-compatible

## Task Lifecycle

```
pending → in_progress → completed
                      → blocked (if dependency unmet)
```

## Branch Strategy

- `main` — Stable, deployable
- `track/<track-id>` — Feature branches per Conductor track
- Merge to main when track is verified

## Development Flow

1. Pick a task from the active track
2. Implement (write tests for core logic)
3. Commit with conventional commit message
4. Move to next task
5. Verify at track completion
