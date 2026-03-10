# TypeScript Style Guide - My Dream Todo App

## General

- **Strict mode** enabled in `tsconfig.json` (`"strict": true`)
- Target ES2022+ (Node.js 22 runtime)
- Prefer `const` over `let`; never use `var`
- Use explicit return types on exported functions
- Use `unknown` over `any`; narrow with type guards

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `task-line-parser.ts` |
| Functions | camelCase | `parseTaskLine()` |
| Types/Interfaces | PascalCase | `ParsedTask`, `ProjectMetadata` |
| Constants | UPPER_SNAKE_CASE | `MAX_LINE_LENGTH` |
| Enums | PascalCase (members too) | `TaskStatus.InProgress` |
| React Components | PascalCase | `TaskItem`, `DayPlanner` |
| Server Actions | camelCase with verb prefix | `createTask()`, `completeDaily()` |

## Imports

- Use path aliases (`@/lib/...`, `@/components/...`)
- Group imports: 1) external packages, 2) internal modules, 3) types
- Prefer named exports over default exports (except for Next.js pages)

```typescript
// External
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Internal
import { parseTaskLine } from '@/lib/engine/task-line-parser';
import { db } from '@/lib/db';

// Types
import type { ParsedTask, TaskStatus } from '@/lib/engine/types';
```

## Types

- Prefer `interface` for object shapes that may be extended
- Prefer `type` for unions, intersections, and utility types
- Use Zod schemas as the source of truth; infer types with `z.infer<>`
- No `I` prefix on interfaces

```typescript
// Zod schema as source of truth
const taskSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['todo', 'done', 'in_progress', 'cancelled', 'deferred']),
  dueDate: z.string().nullable(),
});

// Infer the type
type Task = z.infer<typeof taskSchema>;
```

## Functions

- Prefer arrow functions for callbacks and short utilities
- Use `function` declarations for top-level exported functions
- Keep functions small and focused (single responsibility)
- Prefer early returns over deep nesting

```typescript
// Good
export function parseTaskLine(line: string): ParsedTask | null {
  const match = line.match(TASK_LINE_RE);
  if (!match) return null;

  const [, indent, status, rest] = match;
  return { indent: indent.length, status: parseStatus(status), ...parseEmojiFields(rest) };
}

// Avoid
export function parseTaskLine(line: string): ParsedTask | null {
  const match = line.match(TASK_LINE_RE);
  if (match) {
    const [, indent, status, rest] = match;
    if (status) {
      // deeply nested...
    }
  }
  return null;
}
```

## Error Handling

- Use typed error classes for domain errors
- Throw in Server Actions; catch at the boundary (error.tsx)
- Never silently swallow errors
- Log errors with structured logging (pino)

```typescript
export class VaultError extends Error {
  constructor(message: string, public readonly filePath: string) {
    super(message);
    this.name = 'VaultError';
  }
}
```

## React / Next.js

- Server Components by default; `'use client'` only when needed (interactivity, hooks)
- Colocate Server Actions with their related routes or in `lib/actions/`
- Use Suspense boundaries for async data loading
- Prefer composition over prop drilling

## Testing (Vitest)

- Test files next to source: `__tests__/` directory or `.test.ts` suffix
- Use `describe` blocks to group related tests
- Test names should describe behavior: `it('parses a task with due date and priority')`
- Use factories/fixtures for test data, not inline object literals

```typescript
describe('parseTaskLine', () => {
  it('parses a basic todo task', () => {
    const result = parseTaskLine('- [ ] Buy groceries');
    expect(result).toEqual({
      status: 'todo',
      description: 'Buy groceries',
      indent: 0,
    });
  });
});
```

## Formatting

- **Prettier** for auto-formatting
- 2-space indentation
- Single quotes
- No semicolons (or with — pick one and be consistent)
- Trailing commas in multiline
- 100 character line width
