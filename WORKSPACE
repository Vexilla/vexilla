load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")
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

git_repository(
    name = "io_bazel_rules_dart",
    remote = "https://github.com/cbracken/rules_dart.git",
    tag = "2.17.7",
)

load("@io_bazel_rules_dart//dart/build_rules:repositories.bzl", "dart_repositories")

dart_repositories()

# JS

git_repository(
    name = "rules_nodejs",
    remote = "https://github.com/bazelbuild/rules_nodejs.git",
    tag = "5.8.2",
)

load("@rules_nodejs//:index.bzl", "node_repositories")

node_repositories()

# Kotlin

rules_kotlin_version = "1.7.1"

rules_kotlin_sha = "fd92a98bd8a8f0e1cdcb490b93f5acef1f1727ed992571232d33de42395ca9b3"

http_archive(
    name = "io_bazel_rules_kotlin",
    sha256 = rules_kotlin_sha,
    urls = ["https://github.com/bazelbuild/rules_kotlin/releases/download/v%s/rules_kotlin_release.tgz" % rules_kotlin_version],
)

load("@io_bazel_rules_kotlin//kotlin:repositories.bzl", "kotlin_repositories")

kotlin_repositories()

load("@io_bazel_rules_kotlin//kotlin:core.bzl", "kt_register_toolchains")

kt_register_toolchains()

#
