import SwiftUI
import EventKit
import ServiceManagement

struct SettingsView: View {
    @Bindable var settings: SettingsStore
    @Bindable var coordinator: SyncCoordinator
    @Bindable var calendarService: CalendarService
    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Status section
            statusSection

            Divider()

            // Calendars section
            calendarsSection

            Divider()

            // API section
            apiSection

            Divider()

            // Launch at login
            Toggle("Launch at Login", isOn: $launchAtLogin)
                .onChange(of: launchAtLogin) { _, newValue in
                    do {
                        if newValue {
                            try SMAppService.mainApp.register()
                        } else {
                            try SMAppService.mainApp.unregister()
                        }
                    } catch {
                        print("Launch at login error: \(error)")
                        launchAtLogin = !newValue
                    }
                }

            Divider()

            Button("Quit CalendarSync") {
                NSApplication.shared.terminate(nil)
            }
        }
        .padding(16)
        .frame(width: 320)
    }

    // MARK: - Status Section

    private var statusSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                statusIcon
                Text(statusText)
                    .font(.headline)
                Spacer()
                Button("Sync Now") {
                    coordinator.syncNow()
                }
                .disabled(!settings.isConfigured || isSyncing)
            }

            if let lastSync = settings.lastSyncDate {
                Text("Last sync: \(lastSync, format: .relative(presentation: .named))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var statusIcon: some View {
        Group {
            switch coordinator.status {
            case .idle:
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(.secondary)
            case .syncing:
                Image(systemName: "arrow.triangle.2.circlepath")
                    .foregroundStyle(.blue)
            case .success:
                Image(systemName: "calendar.badge.checkmark")
                    .foregroundStyle(.green)
            case .error:
                Image(systemName: "calendar.badge.exclamationmark")
                    .foregroundStyle(.red)
            case .offline:
                Image(systemName: "wifi.slash")
                    .foregroundStyle(.orange)
            }
        }
    }

    private var statusText: String {
        switch coordinator.status {
        case .idle:
            return "Idle"
        case .syncing:
            return "Syncing…"
        case .success:
            return "Synced"
        case .error(let msg):
            return msg
        case .offline:
            return "Offline"
        }
    }

    private var isSyncing: Bool {
        if case .syncing = coordinator.status { return true }
        return false
    }

    // MARK: - Calendars Section

    private var calendarsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Calendars")
                .font(.headline)

            if !calendarService.accessGranted {
                Button("Grant Calendar Access") {
                    Task {
                        await calendarService.requestAccess()
                    }
                }
            } else if calendarService.availableCalendars.isEmpty {
                Text("No calendars found")
                    .foregroundStyle(.secondary)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(calendarService.availableCalendars, id: \.calendarIdentifier) { calendar in
                            Toggle(isOn: Binding(
                                get: { settings.selectedCalendarIDs.contains(calendar.calendarIdentifier) },
                                set: { isSelected in
                                    if isSelected {
                                        settings.selectedCalendarIDs.insert(calendar.calendarIdentifier)
                                    } else {
                                        settings.selectedCalendarIDs.remove(calendar.calendarIdentifier)
                                    }
                                }
                            )) {
                                HStack(spacing: 6) {
                                    Circle()
                                        .fill(Color(cgColor: calendar.cgColor))
                                        .frame(width: 10, height: 10)
                                    Text(calendar.title)
                                }
                            }
                            .toggleStyle(.checkbox)
                        }
                    }
                }
                .frame(maxHeight: 200)
            }
        }
    }

    // MARK: - API Section

    private var apiSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("API Configuration")
                .font(.headline)

            TextField("API URL", text: $settings.apiURL)
                .textFieldStyle(.roundedBorder)

            SecureField("API Token", text: $settings.apiToken)
                .textFieldStyle(.roundedBorder)
        }
    }
}
