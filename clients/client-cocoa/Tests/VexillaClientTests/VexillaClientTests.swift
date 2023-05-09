import XCTest
@testable import VexillaClient

final class VexillaClientTests: XCTestCase {
    func testExample() {

        let expectation = XCTestExpectation(description: "Download flags")

        var client = VexillaClient(environment: "dev", baseUrl: "https://streamparrot-feature-flags.s3.amazonaws.com", customInstanceHash: "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a")

        client.fetchFlags(fileName: "features.json", fetchCompletionHandler: { flags, error in

            guard flags != nil else {
                dump("Error: Flags were nil in test")
                return
            }

            client.setFlags(flags: flags!)

            XCTAssertEqual(client.should(featureName: "testingWorkingGradual"), true)

            XCTAssertEqual(client.should(featureName: "testingNonWorkingGradual"), false)

            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 30.0)

    }

    static var allTests = [
        ("testExample", testExample),
    ]
}
