load("@rules_kotlin//kotlin:jvm.bzl", "kt_jvm_library", "kt_jvm_test")

kt_jvm_library(
    name = "vexilla_client",
    srcs = glob(["src/**/*.kt"]),
    deps = [
        "@maven//:org_jetbrains_kotlin_kotlin_stdlib_jdk8",
        "@maven//:org_jetbrains_kotlinx_kotlinx_datetime",
        "@maven//:org_jetbrains_kotlinx_kotlinx_serialization_json",
    ],
)

kt_jvm_test(
    name = "vexilla_client_test",
    srcs = glob(["src/**/*.kt"]),
    deps = [
        ":vexilla_client",
        "@maven//:io_ktor_ktor_client_cio",
        "@maven//:io_ktor_ktor_client_core",
        "@maven//:org_jetbrains_kotlin_kotlin_test",
        "@maven//:org_junit_jupiter_junit_jupiter",
        "@maven//:org_junit_jupiter_junit_jupiter_api",
        "@maven//:org_junit_jupiter_junit_jupiter_engine",
    ],
)
