import Foundation
import Network

actor SyncService {
    private let session = URLSession.shared
    private let maxRetries = 3
    private let backoffDelays: [UInt64] = [0, 2_000_000_000, 4_000_000_000] // 0s, 2s, 4s in nanoseconds

    private let pathMonitor = NWPathMonitor()
    private var isConnected = true
    private var onConnectivityChange: (@Sendable (Bool) -> Void)?

    init() {
        let monitor = pathMonitor
        // We need to capture self weakly; use a detached task to set up the handler
        Task { [weak self] in
            await self?.setupMonitor(monitor)
        }
    }

    private func setupMonitor(_ monitor: NWPathMonitor) {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { [weak self] in
                let connected = path.status == .satisfied
                await self?.updateConnectivity(connected)
            }
        }
        monitor.start(queue: DispatchQueue(label: "app.dreamtodo.CalendarSync.network"))
    }

    private func updateConnectivity(_ connected: Bool) {
        let changed = isConnected != connected
        isConnected = connected
        if changed {
            onConnectivityChange?(connected)
        }
    }

    func setConnectivityHandler(_ handler: @escaping @Sendable (Bool) -> Void) {
        onConnectivityChange = handler
    }

    func getIsConnected() -> Bool {
        return isConnected
    }

    func sync(payload: SyncPayload, apiURL: String, token: String) async -> Result<SyncResponse, SyncError> {
        guard isConnected else {
            return .failure(.offline)
        }

        guard let url = URL(string: apiURL) else {
            return .failure(.invalidURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let encoder = JSONEncoder()
        do {
            request.httpBody = try encoder.encode(payload)
        } catch {
            return .failure(.encodingError(error.localizedDescription))
        }

        for attempt in 0..<maxRetries {
            if attempt > 0 {
                try? await Task.sleep(nanoseconds: backoffDelays[attempt])
            }

            do {
                let (data, response) = try await session.data(for: request)

                guard let httpResponse = response as? HTTPURLResponse else {
                    continue
                }

                if httpResponse.statusCode == 401 {
                    // Don't retry auth failures
                    return .failure(.authError)
                }

                if httpResponse.statusCode == 200 {
                    let decoder = JSONDecoder()
                    let syncResponse = try decoder.decode(SyncResponse.self, from: data)
                    return .success(syncResponse)
                }

                // Server error — retry
                if attempt == maxRetries - 1 {
                    let body = String(data: data, encoding: .utf8) ?? "Unknown error"
                    return .failure(.serverError(httpResponse.statusCode, body))
                }
            } catch is CancellationError {
                return .failure(.cancelled)
            } catch {
                if attempt == maxRetries - 1 {
                    return .failure(.networkError(error.localizedDescription))
                }
            }
        }

        return .failure(.networkError("Max retries exceeded"))
    }

    deinit {
        pathMonitor.cancel()
    }
}

enum SyncError: Error, Sendable {
    case offline
    case invalidURL
    case authError
    case encodingError(String)
    case serverError(Int, String)
    case networkError(String)
    case cancelled

    var displayMessage: String {
        switch self {
        case .offline:
            return "No network connection"
        case .invalidURL:
            return "Invalid API URL"
        case .authError:
            return "Authentication failed — check your token"
        case .encodingError(let msg):
            return "Encoding error: \(msg)"
        case .serverError(let code, let body):
            return "Server error (\(code)): \(body)"
        case .networkError(let msg):
            return "Network error: \(msg)"
        case .cancelled:
            return "Sync cancelled"
        }
    }
}
