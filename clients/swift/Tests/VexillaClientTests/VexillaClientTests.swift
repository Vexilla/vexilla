@testable import VexillaClient
import XCTest

#if canImport(FoundationNetworking)
  import FoundationNetworking
#endif

final class VexillaClientTests: XCTestCase {
  var baseUrl = ""
  var vexillaClient: VexillaClient? = nil

  override func setUp() async throws {
    var baseHost = ProcessInfo.processInfo.environment["TEST_SERVER_HOST"]
    if baseHost == nil {
      baseHost = "localhost:3000"
    }

    let baseUrl = "http://\(baseHost)"
    var vexillaClient = VexillaClient(environment: "dev", baseUrl: baseUrl, instanceId: "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a")

    let manifest: Manifest = try await vexillaClient.getManifest { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch manifest")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }
    vexillaClient.setManifest(manifest: manifest)

    try await vexillaClient.syncManifest { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch manifest")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }

    self.vexillaClient = vexillaClient
  }

  func testGradual() async throws {
    let gradualGroup: Group = try await vexillaClient!.getFlags(groupNameOrId: "Gradual") { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch gradual group")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }

    try vexillaClient!.setFlags(groupNameOrId: "Gradual", group: gradualGroup)

    try await vexillaClient!.syncFlags(groupNameOrId: "Gradual") { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch gradual group")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }

    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Gradual", featureNameOrId: "testingWorkingGradual"))
    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Gradual", featureNameOrId: "testingNonWorkingGradual"))
  }

  func testSelective() async throws {
    try await vexillaClient!.syncFlags(groupNameOrId: "Selective") { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch selective group")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }

    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Selective", featureNameOrId: "String"))

    XCTAssertTrue(try vexillaClient!.shouldCustomString(groupNameOrId: "Selective", featureNameOrId: "String", instanceId: "shouldBeInList"))
    XCTAssertFalse(try vexillaClient!.shouldCustomString(groupNameOrId: "Selective", featureNameOrId: "String", instanceId: "shouldNOTBeInList"))

    XCTAssertTrue(try vexillaClient!.shouldCustomInt(groupNameOrId: "Selective", featureNameOrId: "Number", instanceId: 42))
    XCTAssertTrue(try vexillaClient!.shouldCustomInt64(groupNameOrId: "Selective", featureNameOrId: "Number", instanceId: 42))

    XCTAssertFalse(try vexillaClient!.shouldCustomInt(groupNameOrId: "Selective", featureNameOrId: "Number", instanceId: 43))
    XCTAssertFalse(try vexillaClient!.shouldCustomInt64(groupNameOrId: "Selective", featureNameOrId: "Number", instanceId: 43))
  }

  func testValue() async throws {
    try await vexillaClient!.syncFlags(groupNameOrId: "Value") { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch value group")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }

    XCTAssertEqual("foo", try vexillaClient!.valueString(groupNameOrId: "Value", featureNameOrId: "String", defaultString: ""))

    XCTAssertEqual(42, try vexillaClient!.valueInt(groupNameOrId: "Value", featureNameOrId: "Integer", defaultInt32: 0))
    XCTAssertEqual(42, try vexillaClient!.valueInt64(groupNameOrId: "Value", featureNameOrId: "Integer", defaultInt64: 0))

    XCTAssertEqual(42.42, try vexillaClient!.valueFloat(groupNameOrId: "Value", featureNameOrId: "Float", defaultFloat32: 0.0))
    XCTAssertEqual(42.42, try vexillaClient!.valueFloat64(groupNameOrId: "Value", featureNameOrId: "Float", defaultFloat64: 0.0))

    try await vexillaClient!.syncFlags(groupNameOrId: "Scheduled") { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch scheduled group")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }

    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "beforeGlobal"))
    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "duringGlobal"))
    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "afterGlobal"))

    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "beforeGlobalStartEnd"))
    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "duringGlobalStartEnd"))
    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "afterGlobalStartEnd"))

    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "beforeGlobalDaily"))
    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "duringGlobalDaily"))
    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "afterGlobalDaily"))
  }

  func testScheduled() async throws {
    try await vexillaClient!.syncFlags(groupNameOrId: "Scheduled") { urlString -> String in
      let url = URL(string: urlString)!
      let request = URLRequest(url: url)

      return try await withCheckedThrowingContinuation { continuation in
        URLSession.shared.dataTask(with: request) { data, _, error in
          if error != nil {
            return continuation.resume(throwing: "could not fetch scheduled group")
          }
          return continuation.resume(returning: String(decoding: data!, as: UTF8.self))
        }.resume()
      }
    }

    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "beforeGlobal"))
    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "duringGlobal"))
    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "afterGlobal"))

    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "beforeGlobalStartEnd"))
    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "duringGlobalStartEnd"))
    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "afterGlobalStartEnd"))

    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "beforeGlobalDaily"))
    XCTAssertTrue(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "duringGlobalDaily"))
    XCTAssertFalse(try vexillaClient!.should(groupNameOrId: "Scheduled", featureNameOrId: "afterGlobalDaily"))
  }
}
