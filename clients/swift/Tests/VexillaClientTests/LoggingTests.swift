import Foundation
import XCTest

@testable import VexillaClient

#if canImport(Darwin)
    import Darwin
#else
    import Glibc
#endif

@available(macOS 10.15.0, *)
final class LoggingTests: XCTestCase {
    private func captureDiagnostics(_ operation: () async throws -> Void) async rethrows -> String {
        let originalStderr = dup(STDERR_FILENO)
        let diagnosticPipe = Pipe()
        dup2(diagnosticPipe.fileHandleForWriting.fileDescriptor, STDERR_FILENO)
        defer {
            dup2(originalStderr, STDERR_FILENO)
            close(originalStderr)
        }
        try await operation()
        fflush(stderr)
        dup2(originalStderr, STDERR_FILENO)
        diagnosticPipe.fileHandleForWriting.closeFile()
        return String(
            decoding: diagnosticPipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
    }

    func testDiagnosticsAreOptInAndPreserveFailures() async throws {
        for showLogs in [false, true] {
            let diagnostics = try await captureDiagnostics {
                var client = VexillaClient(
                    environment: "prod", baseUrl: "https://private-token@contract",
                    instanceId: "private-instance", showLogs: showLogs)
                let manifest = try await client.getManifest { _ in
                    Data("{\"version\":\"v1\",\"groups\":[]}".utf8)
                }
                try client.setManifest(manifest: manifest)
                do {
                    _ = try await client.getManifest { _ in
                        throw VexillaError("fetch", "private-callback-error")
                    }
                    XCTFail("Fetch failure was swallowed")
                } catch let error as VexillaError { XCTAssertEqual(error.kind, "fetch") }
                let invalidManifest = Manifest(version: "invalid", groups: [])
                do {
                    try client.setManifest(manifest: invalidManifest)
                    XCTFail("Validation failure was swallowed")
                } catch let error as VexillaError { XCTAssertEqual(error.kind, "validation") }
            }
            if showLogs {
                for expected in [
                    "manifest.fetch outcome=success", "manifest.install outcome=success",
                    "manifest.fetch outcome=failure", "manifest.install outcome=failure",
                ] {
                    XCTAssertTrue(diagnostics.contains(expected), diagnostics)
                }
                XCTAssertFalse(diagnostics.contains("private-"))
            } else {
                XCTAssertEqual(diagnostics, "")
            }
        }
    }
}
