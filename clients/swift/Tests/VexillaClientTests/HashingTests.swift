@testable import VexillaClient
import XCTest

final class VexillaHashingTests: XCTestCase {
  private let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

  private let seedA = 0.11
  private let seedB = 0.22

  func testStringWorking() {
    XCTAssertEqual(hashString(stringToHash: uuid, seed: seedA) <= 0.4, true)
  }

  func testStringNonWorking() {
    XCTAssertEqual(hashString(stringToHash: uuid, seed: seedB) > 0.4, true)
  }

  func testInt() {
    XCTAssertEqual(hashInt(intToHash: 42, seed: seedB) > 0.4, true)
  }

  func testFloat() {
    XCTAssertEqual(hashFloat(floatToHash: 42.42, seed: seedB) > 0.4, false)
  }
}
