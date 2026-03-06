#!/usr/bin/env tsx
/**
 * Seed script: generates realistic executive meeting events for today
 * and pushes them via the calendar sync API.
 *
 * Usage: pnpm seed:calendar <API_TOKEN> [BASE_URL]
 *
 * BASE_URL defaults to http://localhost:3000
 */

const token = process.argv[2];
if (!token) {
  console.error("Usage: pnpm seed:calendar <API_TOKEN> [BASE_URL]");
  process.exit(1);
}

const baseUrl = process.argv[3] ?? "http://localhost:3000";
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}).format(new Date());

function eventTime(hour: number, minute = 0): string {
  return `${today}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
}

const events = [
  {
    external_id: `seed-standup-${today}`,
    title: "Daily Standup",
    start_time: eventTime(9, 0),
    end_time: eventTime(9, 15),
    location: "Zoom",
    calendar_name: "Work",
    date: today,
  },
  {
    external_id: `seed-1on1-sarah-${today}`,
    title: "1:1 with Sarah (Product)",
    start_time: eventTime(10, 0),
    end_time: eventTime(10, 30),
    location: "Room 3B",
    calendar_name: "Work",
    date: today,
  },
  {
    external_id: `seed-strategy-${today}`,
    title: "Q2 Strategy Review",
    start_time: eventTime(11, 0),
    end_time: eventTime(12, 0),
    location: "Board Room",
    description: "Review Q2 OKRs and adjust priorities",
    calendar_name: "Work",
    date: today,
  },
  {
    external_id: `seed-lunch-${today}`,
    title: "Lunch with Investor (Alex M.)",
    start_time: eventTime(12, 30),
    end_time: eventTime(13, 30),
    location: "The Capital Grille",
    calendar_name: "Work",
    date: today,
  },
  {
    external_id: `seed-eng-sync-${today}`,
    title: "Engineering Sync",
    start_time: eventTime(14, 0),
    end_time: eventTime(14, 45),
    location: "Zoom",
    description: "Sprint progress and blockers",
    calendar_name: "Work",
    date: today,
  },
  {
    external_id: `seed-1on1-mike-${today}`,
    title: "1:1 with Mike (Engineering)",
    start_time: eventTime(15, 0),
    end_time: eventTime(15, 30),
    location: "Room 2A",
    calendar_name: "Work",
    date: today,
  },
  {
    external_id: `seed-board-prep-${today}`,
    title: "Board Deck Prep",
    start_time: eventTime(16, 0),
    end_time: eventTime(17, 0),
    location: "Focus Room",
    description: "Finalize slides for next week's board meeting",
    calendar_name: "Work",
    date: today,
  },
];

async function main() {
  console.log(`Syncing ${events.length} calendar events for ${today}...`);

  const res = await fetch(`${baseUrl}/api/calendar/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ events }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Error ${res.status}: ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log("Sync complete:", result.summary);
}

main();
