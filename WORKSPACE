load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

#CSharp

http_archive(
    name = "rules_dotnet",
    sha256 = "a119674a818822a80622d4c6ba2facd134bf86f8489db5966e5a8138c1a9fc47",
    strip_prefix = "rules_dotnet-0.8.11",
    url = "https://github.com/bazelbuild/rules_dotnet/releases/download/v0.8.11/rules_dotnet-v0.8.11.tar.gz",
)

load(
    "@rules_dotnet//dotnet:repositories.bzl",
    "dotnet_register_toolchains",
    "rules_dotnet_dependencies",
)

rules_dotnet_dependencies()

# TODO: Figure out correct version
dotnet_register_toolchains("dotnet", "7.0.101")

load("@rules_dotnet//dotnet:rules_dotnet_nuget_packages.bzl", "rules_dotnet_nuget_packages")

rules_dotnet_nuget_packages()

# Dart

# git_repository(
#     name = "io_bazel_rules_dart",
#     remote = "https://github.com/cbracken/rules_dart.git",
#     tag = "2.17.7",
# )

# load("@io_bazel_rules_dart//dart/build_rules:repositories.bzl", "dart_repositories")

# dart_repositories()

# Kotlin

# rules_kotlin_version = "1.7.1"

# rules_kotlin_sha = "fd92a98bd8a8f0e1cdcb490b93f5acef1f1727ed992571232d33de42395ca9b3"

# http_archive(
#     name = "io_bazel_rules_kotlin",
#     sha256 = rules_kotlin_sha,
#     urls = ["https://github.com/bazelbuild/rules_kotlin/releases/download/v%s/rules_kotlin_release.tgz" % rules_kotlin_version],
# )

# load("@io_bazel_rules_kotlin//kotlin:repositories.bzl", "kotlin_repositories")

# kotlin_repositories()

# load("@io_bazel_rules_kotlin//kotlin:core.bzl", "kt_register_toolchains")

# kt_register_toolchains()

# Rust

# To find additional information on this release or newer ones visit:
# https://github.com/bazelbuild/rules_rust/releases
http_archive(
    name = "rules_rust",
    sha256 = "6357de5982dd32526e02278221bb8d6aa45717ba9bbacf43686b130aa2c72e1e",
    urls = ["https://github.com/bazelbuild/rules_rust/releases/download/0.30.0/rules_rust-v0.30.0.tar.gz"],
)

load("@rules_rust//rust:repositories.bzl", "rules_rust_dependencies", "rust_register_toolchains")
load("@rules_rust//crate_universe:repositories.bzl", "crate_universe_dependencies")

rules_rust_dependencies()

rust_register_toolchains()

crate_universe_dependencies()
