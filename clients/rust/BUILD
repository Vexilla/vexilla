load("@rules_rust//rust:defs.bzl", "rust_library", "rust_test")

rust_library(
    name = "vexilla_client",
    srcs = ["src/lib.rs"],
    edition = "2021",
)

rust_test(
    name = "unit_test",
    crate = ":vexilla_client",
    deps = [],
)
