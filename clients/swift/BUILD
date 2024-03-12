load("@build_bazel_rules_swift//swift:swift.bzl", "swift_library", "swift_test")

swift_library(
    name = "vexilla_client_lib",
    srcs = [
        "Sources/Hashing.swift",
        "Sources/Scheduling.swift",
        "Sources/Types.swift",
        "Sources/Utils.swift",
        "Sources/VexillaClient.swift",
    ],
    tags = [],
)

swift_test(
    name = "vexilla_client_test",
    srcs = [
        "Tests/LinuxMain.swift",
        "Tests/VexillaClientTests/HashingTests.swift",
        "Tests/VexillaClientTests/SchedulingTests.swift",
        "Tests/VexillaClientTests/VexillaClientTests.swift",
        "Tests/VexillaClientTests/XCTestManifests.swift",
    ],
    target_compatible_with = ["@platforms//os:macos"],
    deps = [":vexilla_client_lib"],
)
