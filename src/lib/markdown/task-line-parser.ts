import type { Task, Priority } from "./schemas";

/** Matches a task checkbox line: optional indent, - or *, space, [ ], space, content */
const TASK_LINE_RE = /^(\s*)[-*]\s+\[([xX ])\]\s+(.+)$/;

/** Date pattern: YYYY-MM-DD */
const DATE_RE = /\d{4}-\d{2}-\d{2}/;

/** Emoji date field patterns */
const DUE_RE = /📅\s*(\d{4}-\d{2}-\d{2})/;
const DONE_RE = /✅\s*(\d{4}-\d{2}-\d{2})/;
const SCHEDULED_RE = /⏳\s*(\d{4}-\d{2}-\d{2})/;
const CREATED_RE = /➕\s*(\d{4}-\d{2}-\d{2})/;
const START_RE = /🛫\s*(\d{4}-\d{2}-\d{2})/;

/** Recurrence: 🔁 followed by the rule text up to the next emoji or end */
const RECURRENCE_RE = /🔁\s*([^📅✅⏳➕🛫🔺⏫🔼🔽⬇️🆔⛔#\n]+)/;

/** Task ID: 🆔 followed by identifier */
const TASK_ID_RE = /🆔\s*(\S+)/;

/** Depends-on: ⛔ followed by comma-separated IDs */
const DEPENDS_ON_RE = /⛔\s*([^📅✅⏳➕🛫🔺⏫🔼🔽⬇️🆔#\n]+)/;

/** Tag pattern: #word */
const TAG_RE = /#([\w-]+)/g;

/** Priority emoji map */
const PRIORITY_EMOJIS: Array<[RegExp, Priority]> = [
  [/🔺/, "highest"],
  [/⏫/, "high"],
  [/🔼/, "medium"],
  [/🔽/, "low"],
  [/⬇️/, "lowest"],
];

/** All emoji patterns that should be stripped from the title */
const STRIP_PATTERNS = [
  /📅\s*\d{4}-\d{2}-\d{2}/g,
  /✅\s*\d{4}-\d{2}-\d{2}/g,
  /⏳\s*\d{4}-\d{2}-\d{2}/g,
  /➕\s*\d{4}-\d{2}-\d{2}/g,
  /🛫\s*\d{4}-\d{2}-\d{2}/g,
  /🔁\s*[^📅✅⏳➕🛫🔺⏫🔼🔽⬇️🆔⛔#\n]+/g,
  /🆔\s*\S+/g,
  /⛔\s*[^📅✅⏳➕🛫🔺⏫🔼🔽⬇️🆔#\n]+/g,
  /🔺/g,
  /⏫/g,
  /🔼/g,
  /🔽/g,
  /⬇️/g,
  /#[\w-]+/g,
];

/**
 * Parse a single task line in Obsidian Tasks emoji format.
 * Returns null if the line is not a task line.
 */
export function parseTaskLine(line: string): Omit<Task, "id"> | null {
  const match = TASK_LINE_RE.exec(line);
  if (!match) return null;

  const [, , checkMark, content] = match;
  const completed = checkMark === "x" || checkMark === "X";

  // Extract emoji fields from content
  const dueDate = DUE_RE.exec(content)?.[1];
  const doneDate = DONE_RE.exec(content)?.[1];
  const scheduledDate = SCHEDULED_RE.exec(content)?.[1];
  const createdDate = CREATED_RE.exec(content)?.[1];
  const startDate = START_RE.exec(content)?.[1];
  const recurrenceMatch = RECURRENCE_RE.exec(content);
  const recurrence = recurrenceMatch ? recurrenceMatch[1].trim() : undefined;
  const taskId = TASK_ID_RE.exec(content)?.[1];
  const dependsOnMatch = DEPENDS_ON_RE.exec(content);
  const dependsOn = dependsOnMatch
    ? dependsOnMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // Extract tags
  const tags: string[] = [];
  let tagMatch: RegExpExecArray | null;
  const tagRegex = new RegExp(TAG_RE.source, "g");
  while ((tagMatch = tagRegex.exec(content)) !== null) {
    tags.push(tagMatch[1]);
  }

  // Determine priority
  let priority: Priority = "normal";
  for (const [re, p] of PRIORITY_EMOJIS) {
    if (re.test(content)) {
      priority = p;
      break;
    }
  }

  // Strip all emoji fields from title
  let title = content;
  for (const pattern of STRIP_PATTERNS) {
    title = title.replace(pattern, "");
  }
  title = title.trim();

  return {
    title,
    completed,
    dueDate,
    doneDate,
    scheduledDate,
    createdDate,
    startDate,
    priority,
    recurrence,
    tags,
    taskId,
    dependsOn,
  };
}

/** Check if a line is a task line */
export function isTaskLine(line: string): boolean {
  return TASK_LINE_RE.test(line);
}
