@preconcurrency import EventKit
import Foundation
import Combine

@Observable
@MainActor
final class SyncCoordinator {
    let calendarService: CalendarService
    let settings: SettingsStore
    private let syncService = SyncService()

    var status: SyncStatus = .idle

    private var periodicTimer: Timer?
    private var debounceTask: Task<Void, Never>?
    private var ekObserver: NSObjectProtocol?

    init(calendarService: CalendarService, settings: SettingsStore) {
        self.calendarService = calendarService
        self.settings = settings
    }

    func start() {
        // Observe EventKit changes
        ekObserver = NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: calendarService.store,
            queue: nil
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.debouncedSync()
            }
        }

        // Periodic full sync every 30 minutes
        periodicTimer = Timer.scheduledTimer(withTimeInterval: 1800, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.performSync()
            }
        }

        // Connectivity change handler
        Task {
            await syncService.setConnectivityHandler { [weak self] connected in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if connected {
                        await self.performSync()
                    } else {
                        self.status = .offline
                    }
                }
            }
        }

        // Initial sync
        Task {
            await performSync()
        }
    }

    func stop() {
        periodicTimer?.invalidate()
        periodicTimer = nil
        debounceTask?.cancel()
        debounceTask = nil
        if let ekObserver {
            NotificationCenter.default.removeObserver(ekObserver)
            self.ekObserver = nil
        }
    }

    func syncNow() {
        Task {
            await performSync()
        }
    }

    private func debouncedSync() {
        debounceTask?.cancel()
        debounceTask = Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 second debounce
            guard !Task.isCancelled else { return }
            await performSync()
        }
    }

    func performSync() async {
        guard settings.isConfigured else {
            status = .error("Not configured — set API URL, token, and select calendars")
            return
        }

        let isConnected = await syncService.getIsConnected()
        guard isConnected else {
            status = .offline
            return
        }

        status = .syncing
        calendarService.refreshCalendars()

        let calendar = Calendar.current
        let startDate = calendar.startOfDay(for: Date())
        let endDate = calendar.date(byAdding: .day, value: 8, to: startDate)! // today + 7 days

        let events = calendarService.fetchEvents(
            calendarIDs: settings.selectedCalendarIDs,
            startDate: startDate,
            endDate: endDate
        )

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = TimeZone.current

        let payload = SyncPayload(
            events: events,
            syncWindow: SyncWindow(
                startDate: dateFormatter.string(from: startDate),
                endDate: dateFormatter.string(from: calendar.date(byAdding: .day, value: 7, to: startDate)!)
            )
        )

        let result = await syncService.sync(
            payload: payload,
            apiURL: settings.apiURL,
            token: settings.apiToken
        )

        switch result {
        case .success:
            status = .success(Date())
            settings.lastSyncDate = Date()
        case .failure(let error):
            if case .offline = error {
                status = .offline
            } else {
                status = .error(error.displayMessage)
            }
        }
    }
}
