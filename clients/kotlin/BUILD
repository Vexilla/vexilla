# load("@rules_kotlin//kotlin:core.bzl", "kt_compiler_plugin")
# load("@rules_kotlin//kotlin:jvm.bzl", "kt_jvm_library", "kt_jvm_test")

# kt_compiler_plugin(
#     name = "serialization_plugin",
#     compile_phase = True,
#     id = "org.jetbrains.kotlin.serialization",
#     stubs_phase = True,
#     deps = [
#         "@rules_kotlin//kotlin/compiler:kotlinx-serialization-compiler-plugin",
#     ],
# )

# kt_jvm_library(
#     name = "kotlin_serialization",
#     srcs = [],
#     exported_compiler_plugins = [":serialization_plugin"],
#     exports = [
#         "@maven//:org_jetbrains_kotlinx_kotlinx_serialization_core_jvm",
#     ],
# )

# kt_jvm_library(
#     name = "vexilla_client",
#     srcs = glob(["**/*.kt"]),
#     plugins = [
#         # "@maven//:org_jetbrains_kotlin_kotlin_gradle_plugin",
#         # kotlin("jvm") version "1.9.21"
#     ],
#     deps = [
#         ":kotlin_serialization",
#         "@maven//:org_jetbrains_kotlin_kotlin_stdlib",
#         "@maven//:org_jetbrains_kotlin_kotlin_stdlib_jdk8",
#         "@maven//:org_jetbrains_kotlinx_kotlinx_datetime",
#         "@maven//:org_jetbrains_kotlinx_kotlinx_serialization_json",
#     ],
# )

# kt_jvm_test(
#     name = "vexilla_client_test",
#     srcs = glob(["**/*.kt"]),
#     deps = [
#         ":vexilla_client",
#         "@maven//:io_ktor_ktor_client_cio",
#         "@maven//:io_ktor_ktor_client_core",
#         "@maven//:org_jetbrains_kotlin_kotlin_test",
#         "@maven//:org_junit_jupiter_junit_jupiter",
#         "@maven//:org_junit_jupiter_junit_jupiter_api",
#         "@maven//:org_junit_jupiter_junit_jupiter_engine",
#     ],
# )
