import EventKit
import Foundation

@Observable
@MainActor
final class CalendarService {
    nonisolated(unsafe) let store = EKEventStore()
    var availableCalendars: [EKCalendar] = []
    var accessGranted = false

    func requestAccess() async {
        let eventStore = store
        do {
            let granted = try await eventStore.requestFullAccessToEvents()
            accessGranted = granted
            if granted {
                refreshCalendars()
            }
        } catch {
            print("EventKit access error: \(error)")
            accessGranted = false
        }
    }

    func refreshCalendars() {
        availableCalendars = store.calendars(for: .event)
            .sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
    }

    func fetchEvents(calendarIDs: Set<String>, startDate: Date, endDate: Date) -> [CalendarEventDTO] {
        let calendars = store.calendars(for: .event).filter { calendarIDs.contains($0.calendarIdentifier) }
        guard !calendars.isEmpty else { return [] }

        let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
        let ekEvents = store.events(matching: predicate)

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime]

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = TimeZone.current

        var dtos: [CalendarEventDTO] = []

        for event in ekEvents {
            // Skip all-day events
            guard !event.isAllDay else { continue }

            let calendar = Calendar.current

            // Check if event spans multiple days
            let startDay = calendar.startOfDay(for: event.startDate)
            let endDay = calendar.startOfDay(for: event.endDate)

            if startDay == endDay {
                // Single-day event
                dtos.append(CalendarEventDTO(
                    externalId: event.calendarItemExternalIdentifier,
                    title: event.title ?? "Untitled",
                    startTime: isoFormatter.string(from: event.startDate),
                    endTime: isoFormatter.string(from: event.endDate),
                    location: event.location,
                    description: event.notes,
                    calendarName: event.calendar?.title,
                    date: dateFormatter.string(from: event.startDate)
                ))
            } else {
                // Multi-day: expand to one entry per day
                var currentDay = startDay
                while currentDay <= endDay {
                    let dayStr = dateFormatter.string(from: currentDay)
                    let dayStart = max(event.startDate, currentDay)
                    let nextDay = calendar.date(byAdding: .day, value: 1, to: currentDay)!
                    let dayEnd = min(event.endDate, nextDay)

                    let baseId = event.calendarItemExternalIdentifier ?? "unknown"
                    dtos.append(CalendarEventDTO(
                        externalId: "\(baseId)_\(dayStr)",
                        title: event.title ?? "Untitled",
                        startTime: isoFormatter.string(from: dayStart),
                        endTime: isoFormatter.string(from: dayEnd),
                        location: event.location,
                        description: event.notes,
                        calendarName: event.calendar?.title,
                        date: dayStr
                    ))

                    currentDay = nextDay
                }
            }
        }

        return dtos
    }
}
