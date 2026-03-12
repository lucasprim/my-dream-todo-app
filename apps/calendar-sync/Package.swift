// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "CalendarSync",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "CalendarSync",
            path: "Sources/CalendarSync",
            exclude: ["Info.plist", "AppIcon.icns"],
            linkerSettings: [
                .linkedFramework("EventKit"),
                .linkedFramework("Network"),
                .linkedFramework("ServiceManagement"),
            ]
        ),
    ]
)
