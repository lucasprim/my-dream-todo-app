/**
 * Vault directory structure conventions.
 * All paths are relative to the vault root.
 */
export const VAULT_DIRS = {
  INBOX: "Inbox",
  PROJECTS: "Projects",
  AREAS: "Areas",
  CALENDAR: "Calendar",
} as const;

export const VAULT_FILES = {
  INBOX: "Inbox/inbox.md",
} as const;

/**
 * Obsidian Tasks emoji format tokens.
 * Reference: https://publish.obsidian.md/tasks/Reference/Task+Formats/Tasks+Emoji+Format
 */
export const TASK_EMOJIS = {
  DUE: "📅",
  DONE: "✅",
  SCHEDULED: "⏳",
  CREATED: "➕",
  CANCELLED: "❌",
  START: "🛫",
  PRIORITY_HIGHEST: "🔺",
  PRIORITY_HIGH: "⏫",
  PRIORITY_MEDIUM: "🔼",
  PRIORITY_LOW: "🔽",
  PRIORITY_LOWEST: "⬇️",
  RECURRING: "🔁",
  ID: "🆔",
  DEPENDS_ON: "⛔",
} as const;

export type VaultDir = (typeof VAULT_DIRS)[keyof typeof VAULT_DIRS];
