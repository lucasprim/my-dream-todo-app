# CalendarSync

A native macOS menu bar app that syncs Apple Calendar events to the [My Dream Todo App](../../) web interface.

## Features

- **Real-time sync** — watches for calendar changes via EventKit and pushes updates within seconds
- **Periodic full sync** — reconciles all events every 30 minutes
- **User-selected calendars** — pick which calendars to sync from a popover UI
- **Multi-day event expansion** — events spanning multiple days appear on each day
- **All-day events skipped** — only timed events are synced
- **Reconciliation deletions** — events removed from Apple Calendar are cleaned up on the server
- **Offline resilience** — detects network status, auto-syncs on reconnect
- **Retry with backoff** — failed syncs retry with exponential backoff (0s, 2s, 4s)
- **Secure token storage** — API token stored in macOS Keychain
- **Launch at Login** — optional, via macOS ServiceManagement

## Requirements

- macOS 14 (Sonoma) or later
- Swift 6.0+ (for building from source)

## Install

### From GitHub Releases

1. Download `CalendarSync.dmg` from the [latest release](../../releases?q=calendar-sync)
2. Open the DMG and drag **CalendarSync** to **Applications**
3. Launch CalendarSync — it appears as a calendar icon in the menu bar (no dock icon)

### From Source

```sh
cd apps/calendar-sync
swift build -c release
cp -R .build/release/CalendarSync /Applications/
```

## Setup

1. Click the calendar icon in the menu bar to open the settings popover
2. **API URL** — enter your web app's sync endpoint (e.g. `http://localhost:3000/api/calendar/sync`)
3. **API Token** — enter a valid Bearer token (create one in the web app's Settings page)
4. **Calendars** — grant calendar access when prompted, then check the calendars you want to sync
5. Click **Sync Now** or wait for the automatic sync

## Menu Bar Icons

| Icon | Meaning |
|------|---------|
| `calendar.badge.clock` | Idle |
| `arrow.triangle.2.circlepath` | Syncing |
| `calendar.badge.checkmark` | Last sync succeeded |
| `calendar.badge.exclamationmark` | Sync error |
| `wifi.slash` | Offline |

## Architecture

```
Sources/CalendarSync/
├── App.swift              # @main SwiftUI MenuBarExtra
├── SettingsView.swift     # Popover UI
├── CalendarService.swift  # EventKit integration
├── SyncService.swift      # HTTP client + NWPathMonitor
├── SyncCoordinator.swift  # Orchestrates sync triggers
├── SettingsStore.swift    # UserDefaults + Keychain
├── KeychainHelper.swift   # Security.framework wrapper
└── Models.swift           # DTOs matching the API contract
```

## API

The app POSTs to the web app's `/api/calendar/sync` endpoint with:

```json
{
  "events": [
    {
      "external_id": "ABC123",
      "title": "Team Standup",
      "start_time": "2026-03-12T12:00:00Z",
      "end_time": "2026-03-12T12:30:00Z",
      "location": "Room A",
      "calendar_name": "Work",
      "date": "2026-03-12"
    }
  ],
  "sync_window": {
    "start_date": "2026-03-12",
    "end_date": "2026-03-19"
  }
}
```

The `sync_window` enables reconciliation: events in the date range not present in the payload are deleted from the server.

## Regenerating the App Icon

```sh
cd apps/calendar-sync
swift scripts/generate-icon.swift
mv AppIcon.icns Sources/CalendarSync/AppIcon.icns
```
