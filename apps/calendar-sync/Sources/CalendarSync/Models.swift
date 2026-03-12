import Foundation

struct CalendarEventDTO: Codable, Sendable {
    let externalId: String
    let title: String
    let startTime: String
    let endTime: String
    let location: String?
    let description: String?
    let calendarName: String?
    let date: String

    enum CodingKeys: String, CodingKey {
        case externalId = "external_id"
        case title
        case startTime = "start_time"
        case endTime = "end_time"
        case location
        case description
        case calendarName = "calendar_name"
        case date
    }
}

struct SyncWindow: Codable, Sendable {
    let startDate: String
    let endDate: String

    enum CodingKeys: String, CodingKey {
        case startDate = "start_date"
        case endDate = "end_date"
    }
}

struct SyncPayload: Codable, Sendable {
    let events: [CalendarEventDTO]
    let syncWindow: SyncWindow?

    enum CodingKeys: String, CodingKey {
        case events
        case syncWindow = "sync_window"
    }
}

struct SyncSummary: Codable, Sendable {
    let total: Int
    let created: Int
    let updated: Int
    let deleted: Int
}

struct SyncResponse: Codable, Sendable {
    let ok: Bool?
    let summary: SyncSummary?
    let error: String?
}

enum SyncStatus: Sendable {
    case idle
    case syncing
    case success(Date)
    case error(String)
    case offline
}
