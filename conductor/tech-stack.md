# Tech Stack - My Dream Todo App

## Languages

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | 5.x (strict mode) | All application code |
| SQL | SQLite dialect | Database schema and queries |

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 (App Router) | Full-stack React framework |
| React | 19 | UI library |
| Tailwind CSS | v4 | Utility-first styling |
| shadcn/ui | latest | Component library (copy-paste, customizable) |

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js Server Components | - | Data fetching (reads from SQLite) |
| Next.js Server Actions | - | Mutations (writes to .md files + SQLite) |
| Chokidar | v4 | File system watching for sync changes |

## Database

| Technology | Version | Purpose |
|------------|---------|---------|
| SQLite | 3.x | Derived index over .md vault files |
| better-sqlite3 | latest | Synchronous SQLite driver for Node.js |
| Drizzle ORM | latest | Type-safe ORM + migrations |

## Markdown Processing

| Technology | Purpose |
|------------|---------|
| gray-matter | YAML frontmatter parsing |
| Custom task-line parser | Obsidian Tasks emoji format parsing (regex-based) |

## Validation

| Technology | Purpose |
|------------|---------|
| Zod | Runtime schema validation for actions + markdown parsing |

## Authentication

| Technology | Purpose |
|------------|---------|
| NextAuth.js | Auth for the web app (credentials or passkey for solo user) |

## Testing

| Technology | Purpose |
|------------|---------|
| Vitest | Unit and integration testing |

## Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker Compose | Container orchestration (Next.js + ob sync) |
| obsidian-headless (ob) | Obsidian vault sync daemon |
| Node.js 22+ | Runtime (required by obsidian-headless) |

## Package Manager

**pnpm** - Fast, strict, disk-efficient.

## Key Dependencies

```
# Core
next                         # Web framework
react, react-dom             # UI
tailwindcss                  # Styling
zod                          # Validation

# Database
better-sqlite3               # SQLite driver
drizzle-orm                  # ORM
drizzle-kit                  # Migration CLI

# Markdown
gray-matter                  # Frontmatter parsing

# File System
chokidar                     # File watcher

# Auth
next-auth                    # Authentication

# Utilities
date-fns                     # Date manipulation
nanoid                       # ID generation
pino                         # Structured logging

# Dev
typescript                   # Language
vitest                       # Testing
@types/better-sqlite3        # Type definitions
```
