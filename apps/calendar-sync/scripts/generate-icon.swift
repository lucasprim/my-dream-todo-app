#!/usr/bin/env swift

import AppKit
import Foundation

// Draw a calendar-sync icon: calendar shape with circular sync arrows

func drawIcon(size: CGFloat) -> NSImage {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()

    guard let ctx = NSGraphicsContext.current?.cgContext else {
        image.unlockFocus()
        return image
    }

    let s = size // shorthand
    let pad = s * 0.08

    // -- Background: rounded rectangle with gradient --
    let bgRect = CGRect(x: pad, y: pad, width: s - pad * 2, height: s - pad * 2)
    let bgPath = CGPath(roundedRect: bgRect, cornerWidth: s * 0.18, cornerHeight: s * 0.18, transform: nil)

    // Gradient: top-left teal to bottom-right blue
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let colors = [
        CGColor(colorSpace: colorSpace, components: [0.15, 0.68, 0.72, 1.0])!,  // teal
        CGColor(colorSpace: colorSpace, components: [0.20, 0.40, 0.85, 1.0])!,  // blue
    ] as CFArray
    let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0.0, 1.0])!

    ctx.saveGState()
    ctx.addPath(bgPath)
    ctx.clip()
    ctx.drawLinearGradient(gradient, start: CGPoint(x: pad, y: s - pad), end: CGPoint(x: s - pad, y: pad), options: [])
    ctx.restoreGState()

    // -- Calendar top bar --
    let barHeight = s * 0.18
    let barY = s - pad - barHeight - s * 0.04
    let barRect = CGRect(x: pad + s * 0.02, y: barY, width: s - pad * 2 - s * 0.04, height: barHeight)
    ctx.setFillColor(red: 1, green: 1, blue: 1, alpha: 0.25)
    let barPath = CGPath(roundedRect: barRect, cornerWidth: s * 0.04, cornerHeight: s * 0.04, transform: nil)
    ctx.addPath(barPath)
    ctx.fillPath()

    // -- Calendar binding dots --
    let dotR = s * 0.03
    let dotY = barY + barHeight - dotR
    let dotPositions: [CGFloat] = [s * 0.30, s * 0.50, s * 0.70]
    ctx.setFillColor(red: 1, green: 1, blue: 1, alpha: 0.6)
    for dx in dotPositions {
        ctx.fillEllipse(in: CGRect(x: dx - dotR, y: dotY - dotR, width: dotR * 2, height: dotR * 2))
    }

    // -- Sync arrows (circular arrows in the center-bottom area) --
    let centerX = s * 0.5
    let centerY = s * 0.38
    let arrowRadius = s * 0.18
    let lineWidth = s * 0.045

    ctx.setStrokeColor(red: 1, green: 1, blue: 1, alpha: 0.95)
    ctx.setLineWidth(lineWidth)
    ctx.setLineCap(.round)

    // Top arc (clockwise arrow)
    let startAngle1 = CGFloat.pi * 0.15
    let endAngle1 = CGFloat.pi * 0.85
    ctx.addArc(center: CGPoint(x: centerX, y: centerY), radius: arrowRadius,
               startAngle: startAngle1, endAngle: endAngle1, clockwise: false)
    ctx.strokePath()

    // Arrowhead for top arc
    let tipAngle1 = endAngle1
    let tipX1 = centerX + arrowRadius * cos(tipAngle1)
    let tipY1 = centerY + arrowRadius * sin(tipAngle1)
    let arrowLen = s * 0.07
    ctx.setFillColor(red: 1, green: 1, blue: 1, alpha: 0.95)
    ctx.move(to: CGPoint(x: tipX1, y: tipY1))
    ctx.addLine(to: CGPoint(x: tipX1 + arrowLen * 0.3, y: tipY1 + arrowLen))
    ctx.addLine(to: CGPoint(x: tipX1 - arrowLen * 0.8, y: tipY1 + arrowLen * 0.3))
    ctx.closePath()
    ctx.fillPath()

    // Bottom arc (counter-clockwise arrow)
    let startAngle2 = CGFloat.pi * 1.15
    let endAngle2 = CGFloat.pi * 1.85
    ctx.addArc(center: CGPoint(x: centerX, y: centerY), radius: arrowRadius,
               startAngle: startAngle2, endAngle: endAngle2, clockwise: false)
    ctx.strokePath()

    // Arrowhead for bottom arc
    let tipAngle2 = endAngle2
    let tipX2 = centerX + arrowRadius * cos(tipAngle2)
    let tipY2 = centerY + arrowRadius * sin(tipAngle2)
    ctx.move(to: CGPoint(x: tipX2, y: tipY2))
    ctx.addLine(to: CGPoint(x: tipX2 - arrowLen * 0.3, y: tipY2 - arrowLen))
    ctx.addLine(to: CGPoint(x: tipX2 + arrowLen * 0.8, y: tipY2 - arrowLen * 0.3))
    ctx.closePath()
    ctx.fillPath()

    image.unlockFocus()
    return image
}

func createIconset() {
    let sizes: [(CGFloat, String)] = [
        (16, "icon_16x16"),
        (32, "icon_16x16@2x"),
        (32, "icon_32x32"),
        (64, "icon_32x32@2x"),
        (128, "icon_128x128"),
        (256, "icon_128x128@2x"),
        (256, "icon_256x256"),
        (512, "icon_256x256@2x"),
        (512, "icon_512x512"),
        (1024, "icon_512x512@2x"),
    ]

    let iconsetPath = "AppIcon.iconset"
    let fm = FileManager.default
    try? fm.createDirectory(atPath: iconsetPath, withIntermediateDirectories: true)

    for (size, name) in sizes {
        let image = drawIcon(size: size)
        guard let tiff = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff),
              let png = bitmap.representation(using: .png, properties: [:])
        else {
            print("Failed to create \(name)")
            continue
        }
        let path = "\(iconsetPath)/\(name).png"
        try! png.write(to: URL(fileURLWithPath: path))
        print("Created \(path)")
    }

    // Convert iconset to icns
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
    process.arguments = ["-c", "icns", iconsetPath, "-o", "AppIcon.icns"]
    try! process.run()
    process.waitUntilExit()

    if process.terminationStatus == 0 {
        print("Created AppIcon.icns")
        try? fm.removeItem(atPath: iconsetPath)
    } else {
        print("iconutil failed with status \(process.terminationStatus)")
    }
}

createIconset()
