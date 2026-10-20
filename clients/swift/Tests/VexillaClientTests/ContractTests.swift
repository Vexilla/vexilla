@testable import VexillaClient
import Foundation
import XCTest

@available(macOS 10.15.0, *)
final class ContractTests: XCTestCase {
  func testSharedSeedBounds() throws {
    guard let path = ProcessInfo.processInfo.environment["VEXILLA_CONTRACT_DIR"] else {
      throw XCTSkip("Generate shared artifacts first")
    }
    let dir = URL(fileURLWithPath: path)
    let data = try Data(contentsOf: dir.appendingPathComponent("contract-group.json"))
    let expected = try JSONSerialization.jsonObject(with: Data(contentsOf: dir.appendingPathComponent("expected.json"))) as! [String: Any]
    for sample in expected["seedCases"] as! [[String: Any]] {
      var group = try JSONSerialization.jsonObject(with: data) as! [String: Any]
      var environments = group["environments"] as! [String: [String: Any]]
      var environment = environments["dev"]!
      var features = environment["features"] as! [String: [String: Any]]
      features["gradual"]!["seed"] = sample["value"]!
      environment["features"] = features
      environments["dev"] = environment
      group["environments"] = environments
      let input = try JSONSerialization.data(withJSONObject: group)
      if sample["valid"] as! Bool {
        XCTAssertNoThrow(try JSONDecoder().decode(Group.self, from: input))
      } else {
        XCTAssertThrowsError(try JSONDecoder().decode(Group.self, from: input))
      }
    }
  }

  func testSharedContract() async throws {
    guard let path = ProcessInfo.processInfo.environment["VEXILLA_CONTRACT_DIR"] else { throw XCTSkip("Generate shared artifacts first") }
    let dir = URL(fileURLWithPath: path)
    func read(_ name: String) throws -> Data { try Data(contentsOf: dir.appendingPathComponent(name)) }
    func fetch(_ url: URL) async throws -> Data { try read(url.lastPathComponent) }
    let expected = try JSONSerialization.jsonObject(with: read("expected.json")) as! [String: Any]
    for env in expected["environments"] as! [[String: Any]] {
      for names in [false, true] {
        let eid = env["id"] as! String
        var client = VexillaClient(environment: env[names ? "name" : "id"] as! String, baseUrl: "https://contract", instanceId: "member")
        try await client.syncManifest(fetch: fetch)
        let group = expected[names ? "groupName" : "groupId"] as! String
        let decoded = try await client.getFlags(groupNameOrId: group, fetch: fetch)
        if case let .gradual(f) = decoded.environments[eid]!.features["gradual"]! {
          XCTAssertEqual(f.seed, (env["seed"] as! NSNumber).doubleValue)
          XCTAssertEqual(f.value, (env["threshold"] as! NSNumber).doubleValue)
        } else { XCTFail("Gradual discriminator lost") }
        for fid in (expected["scheduled"] as! [String]) + ["scheduled-active"] {
          let f = decoded.environments[eid]!.features[fid]!
          let clock = Date(timeIntervalSince1970: (expected["referenceClock"] as! NSNumber).doubleValue / 1000)
          XCTAssertEqual(try isScheduleActiveWithNow(schedule:f.schedule,scheduleType:f.scheduleType,now:clock),fid == "scheduled-active")
        }
        try client.setFlags(group: decoded)
        for c in expected["cases"] as! [[String: Any]] {
          let fid = c[names ? "name" : "id"] as! String
          let key = c["expectedKey"] as! String
          if c["kind"] as! String == "value" {
            switch key {
              case "string": XCTAssertEqual(try client.valueString(groupNameOrId: group, featureNameOrId: fid, defaultString: "fallback"), env[key] as! String)
              case "int": XCTAssertEqual(try client.valueInt64(groupNameOrId: group, featureNameOrId: fid, defaultInt64: -1), (env[key] as! NSNumber).int64Value)
              default: XCTAssertEqual(try client.valueFloat64(groupNameOrId: group, featureNameOrId: fid, defaultFloat64: -1), (env[key] as! NSNumber).doubleValue)
            }
          } else {
            let result: Bool
            if let str = c["instance"] as? String { result = try client.shouldCustomString(groupNameOrId: group, featureNameOrId: fid, instanceId: str) }
            else if c["id"] as! String == "selective-int" { result = try client.shouldCustomInt64(groupNameOrId: group, featureNameOrId: fid, instanceId: (c["instance"] as! NSNumber).int64Value) }
            else { result = try client.shouldCustomFloat64(groupNameOrId: group, featureNameOrId: fid, instanceId: (c["instance"] as! NSNumber).doubleValue) }
            XCTAssertEqual(result,env[key] as! Bool, fid)
          }
        }
        for fid in expected["scheduled"] as! [String] { XCTAssertFalse(try client.should(groupNameOrId: group, featureNameOrId: fid)) }
      }
    }
  }
}
