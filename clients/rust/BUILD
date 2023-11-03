load("@rules_rust//rust:defs.bzl", "rust_library", "rust_test")

rust_library(
    name = "vexilla_client",
    srcs = [
        "src/example.rs",
        "src/hashing.rs",
        "src/lib.rs",
        "src/scheduling.rs",
        "src/types.rs",
    ],
    edition = "2018",
)

rust_test(
    name = "unit_test",
    crate = ":vexilla_client",
    deps = [],
)
