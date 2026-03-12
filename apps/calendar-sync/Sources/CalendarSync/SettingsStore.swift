import Foundation
import SwiftUI

@Observable
@MainActor
final class SettingsStore {
    private let defaults = UserDefaults(suiteName: "com.lucasprim.CalendarSync")!

    var apiURL: String {
        didSet { defaults.set(apiURL, forKey: "apiURL") }
    }

    var selectedCalendarIDs: Set<String> {
        didSet { defaults.set(Array(selectedCalendarIDs), forKey: "selectedCalendarIDs") }
    }

    var lastSyncDate: Date? {
        didSet {
            if let lastSyncDate {
                defaults.set(lastSyncDate.timeIntervalSince1970, forKey: "lastSyncDate")
            } else {
                defaults.removeObject(forKey: "lastSyncDate")
            }
        }
    }

    var apiToken: String {
        didSet {
            if apiToken.isEmpty {
                KeychainHelper.delete()
            } else {
                _ = KeychainHelper.save(token: apiToken)
            }
        }
    }

    init() {
        self.apiURL = defaults.string(forKey: "apiURL") ?? "http://localhost:3000/api/calendar/sync"
        let ids = defaults.stringArray(forKey: "selectedCalendarIDs") ?? []
        self.selectedCalendarIDs = Set(ids)
        if let ts = defaults.object(forKey: "lastSyncDate") as? Double {
            self.lastSyncDate = Date(timeIntervalSince1970: ts)
        } else {
            self.lastSyncDate = nil
        }
        self.apiToken = KeychainHelper.load() ?? ""
    }

    var isConfigured: Bool {
        !apiURL.isEmpty && !apiToken.isEmpty && !selectedCalendarIDs.isEmpty
    }
}
