load("@rules_rust//rust:defs.bzl", "rust_library", "rust_test")
load("@rules_rust//crate_universe:defs.bzl", "crate", "crates_vendor", "render_config")

crates_vendor(
    name = "crates_vendor",
    mode = "remote",
    packages = {
        "reqwest": crate.spec(
            features = ["blocking"],
            version = "0.10",
        ),
        "serde": crate.spec(
            features = ["derive"],
            version = "1.0",
        ),
        "serde_json": crate.spec(
            version = "1.0",
        ),
        "tokio": crate.spec(
            features = ["full"],
            version = "0.2",
        ),
        "strum": crate.spec(
            version = "0.25",
        ),
        "strum_macros": crate.spec(
            version = "0.25",
        ),
        "convert_case": crate.spec(
            version = "^0.3.2",
        ),
        "thiserror": crate.spec(
            version = "1.0",
        ),
        "chrono": crate.spec(
            version = "0.4.26",
        ),
        "chrono-tz": crate.spec(
            version = "0.8.3",
        ),
    },
    # Demonstrate that `crates_vendor` can accept a render_config. To regen this target, simply
    # navigate to this directory and run `bazel run //vendor_remote_pkgs:crates_vendor_pkgs`.
    render_config = render_config(
        regen_command = "See https://github.com/bazelbuild/rules_rust/blob/main/examples/crate_universe/vendor_local_pkgs/BUILD.bazel",
    ),
    repository_name = "crates_vendor_pkgs",
)

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
    proc_macro_deps = [
        "@crates_vendor_pkgs//:strum_macros",
    ],
    deps = [
        "@crates_vendor_pkgs//:chrono",
        "@crates_vendor_pkgs//:chrono-tz",
        "@crates_vendor_pkgs//:convert_case",
        "@crates_vendor_pkgs//:reqwest",
        "@crates_vendor_pkgs//:serde",
        "@crates_vendor_pkgs//:serde_json",
        "@crates_vendor_pkgs//:strum",
        "@crates_vendor_pkgs//:thiserror",
        "@crates_vendor_pkgs//:tokio",
    ],
)

rust_test(
    name = "unit_test",
    srcs = [
        "src/hashing.rs",
        "src/lib.rs",
        "src/scheduling.rs",
    ],
    crate = ":vexilla_client",
    deps = [],
)
