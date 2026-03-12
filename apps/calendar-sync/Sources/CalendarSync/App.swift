import SwiftUI
import AppKit

@main
struct CalendarSyncApp: App {
    @State private var settings = SettingsStore()
    @State private var calendarService = CalendarService()
    @State private var coordinator: SyncCoordinator?

    init() {
        // Hide dock icon — run as menu bar agent
        NSApplication.shared.setActivationPolicy(.accessory)
    }

    var body: some Scene {
        MenuBarExtra {
            if let coordinator {
                SettingsView(
                    settings: settings,
                    coordinator: coordinator,
                    calendarService: calendarService
                )
            } else {
                Text("Starting…").padding()
            }
        } label: {
            menuBarIcon
        }
        .menuBarExtraStyle(.window)
    }

    private var menuBarIcon: some View {
        Group {
            if let coordinator {
                switch coordinator.status {
                case .idle:
                    Image(systemName: "calendar.badge.clock")
                case .syncing:
                    Image(systemName: "arrow.triangle.2.circlepath")
                case .success:
                    Image(systemName: "calendar.badge.checkmark")
                case .error:
                    Image(systemName: "calendar.badge.exclamationmark")
                case .offline:
                    Image(systemName: "wifi.slash")
                }
            } else {
                Image(systemName: "calendar.badge.clock")
            }
        }
        .task {
            await calendarService.requestAccess()
            let coord = SyncCoordinator(calendarService: calendarService, settings: settings)
            coordinator = coord
            coord.start()
        }
    }
}
