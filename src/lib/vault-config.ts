/**
 * Vault directory structure conventions.
 * All paths are relative to the vault root.
 *
 * Override defaults with environment variables:
 *   VAULT_DIR_INBOX, VAULT_DIR_PROJECTS, VAULT_DIR_AREAS, VAULT_DIR_CALENDAR
 *   VAULT_FILE_INBOX
 */

function dir(envVar: string, defaultVal: string): string {
  return process.env[envVar] ?? defaultVal;
}

export function getVaultDirs() {
  return {
    INBOX:    dir("VAULT_DIR_INBOX",    "Inbox"),
    PROJECTS: dir("VAULT_DIR_PROJECTS", "Projects"),
    AREAS:    dir("VAULT_DIR_AREAS",    "Areas"),
    CALENDAR: dir("VAULT_DIR_CALENDAR", "Calendar"),
  };
}

export function getVaultFiles() {
  const dirs = getVaultDirs();
  return {
    INBOX: process.env.VAULT_FILE_INBOX ?? `${dirs.INBOX}/inbox.md`,
  };
}

// Static constants kept for backwards compatibility with existing imports
// (will reflect env vars at module load time in Node.js)
export const VAULT_DIRS = getVaultDirs();
export const VAULT_FILES = getVaultFiles();

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

export type VaultDir = string;
