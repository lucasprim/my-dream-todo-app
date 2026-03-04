# Product Guidelines - My Own Todo App

## Voice and Tone

**Friendly and approachable.** The app should feel like a helpful personal assistant, not enterprise software. Use warm, casual language in UI text, tooltips, and empty states. Encourage the user without being patronizing.

Examples:
- Good: "Ready to plan your day?" / "Nice work! 3 tasks completed."
- Avoid: "No daily plan has been initialized for the current date." / "Task #4521 status updated."

## Design Principles

### 1. Performance First

The UI must feel instant. No loading spinners for core interactions (completing a task, navigating between views). SQLite queries are sub-millisecond; the UI should reflect that speed.

- Optimistic updates for task mutations
- Server Components for zero-JS data fetching
- Prefetch adjacent views

### 2. User Delight and Polish

This is a personal tool you use every day. It should feel premium.

- Smooth animations for task completion (satisfying checkmark)
- Thoughtful empty states with helpful prompts
- Keyboard shortcuts for power users (Cmd+K, quick capture)
- Consistent visual rhythm and spacing

### 3. Developer Experience Focused

The codebase should be a pleasure to work in. Clean architecture, type safety, and clear boundaries between concerns.

- Strict TypeScript throughout
- Clear separation: engine (parsing) / db (index) / vault (files) / actions / components
- Comprehensive tests for the markdown engine (the hardest part)
- Easy to add new features without touching unrelated code

## Obsidian Compatibility

All generated `.md` files MUST be readable and editable in Obsidian without any special plugins (beyond the Tasks plugin for emoji format). The app should never produce markdown that looks broken in Obsidian.

## Data Philosophy

- The `.md` files are the **source of truth**, never the database
- SQLite is a **derived index** that can be rebuilt from scratch at any time
- Never lose user data — even on crashes, the worst case is a stale index
