load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

http_archive(
    name = "bazel_skylib",
    sha256 = "66ffd9315665bfaafc96b52278f57c7e2dd09f5ede279ea6d39b2be471e7e3aa",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/releases/download/1.4.2/bazel-skylib-1.4.2.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/releases/download/1.4.2/bazel-skylib-1.4.2.tar.gz",
    ],
)

#CSharp

http_archive(
    name = "rules_dotnet",
    sha256 = "5f9dedad3b0e1a6efe8a2418291de53e63a4e6320ed1e16a8290ec8113624bbc",
    strip_prefix = "rules_dotnet-0.11.1",
    url = "https://github.com/bazelbuild/rules_dotnet/releases/download/v0.11.1/rules_dotnet-v0.11.1.tar.gz",
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

load("@rules_dotnet//dotnet:paket2bazel_dependencies.bzl", "paket2bazel_dependencies")

paket2bazel_dependencies()

load("//clients/csharp:deps/paket.bzl", "paket")

paket()

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

load(
    "//clients/rust/crates:crates.bzl",
    crates_vendor_packages_repositories = "crate_repositories",
)

crates_vendor_packages_repositories()

#PHP

http_archive(
    name = "rules_php",
    strip_prefix = "php_codebase-master",
    url = "https://github.com/cmgriffing/php_codebase/archive/refs/heads/master.tar.gz",
)

git_repository(
    name = "io_bazel_rules_docker",
    remote = "https://github.com/bazelbuild/rules_docker.git",
    tag = "v0.25.0",
)

# load(
#     "@io_bazel_rules_docker//container:container.bzl",
#     "container_pull",
# )
# load(
#     "@io_bazel_rules_docker//repositories:repositories.bzl",
#     container_repositories = "repositories",
# )

# container_repositories()

# container_pull(
#     name = "php56_base",
#     registry = "index.docker.io",
#     repository = "library/php",
#     tag = "5.6-cli",
#     # digest = "sha256:506e2d5852de1d7c90d538c5332bd3cc33b9cbd26f6ca653875899c505c82687",
# )
