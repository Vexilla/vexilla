load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

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

#PHP (Docker for now)

# http_archive(
#     name = "rules_php",
#     strip_prefix = "php_codebase-master",
#     url = "https://github.com/cmgriffing/php_codebase/archive/refs/heads/master.tar.gz",
# )

# git_repository(
#     name = "io_bazel_rules_docker",
#     remote = "https://github.com/bazelbuild/rules_docker.git",
#     tag = "v0.25.0",
# )

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

# Elixir (Docker for now)

# http_archive(
#     name = "rules_erlang",
#     strip_prefix = "rules_erlang-3.14.0",
#     urls = ["https://github.com/rabbitmq/rules_erlang/archive/refs/tags/3.14.0.zip"],
# )

# load(
#     "@rules_erlang//:rules_erlang.bzl",
#     "erlang_config",
#     "rules_erlang_dependencies",
# )

# erlang_config()

# rules_erlang_dependencies()

# load("@erlang_config//:defaults.bzl", "register_defaults")

# register_defaults()

# Kotlin

http_archive(
    name = "rules_kotlin",
    sha256 = "5766f1e599acf551aa56f49dab9ab9108269b03c557496c54acaf41f98e2b8d6",
    url = "https://github.com/bazelbuild/rules_kotlin/releases/download/v1.9.0/rules_kotlin-v1.9.0.tar.gz",
)

load("@rules_kotlin//kotlin:repositories.bzl", "kotlin_repositories", "kotlinc_version")

kotlin_repositories(
    compiler_release = kotlinc_version(
        release = "1.9.21",
        sha256 = "cf17e0272bc065d49e64a86953b73af06065370629f090d5b7c2fe353ccf9c1a",
    ),
)

load("@rules_kotlin//kotlin:core.bzl", "kt_register_toolchains")

kt_register_toolchains()

RULES_JVM_EXTERNAL_TAG = "5.3"

RULES_JVM_EXTERNAL_SHA = "d31e369b854322ca5098ea12c69d7175ded971435e55c18dd9dd5f29cc5249ac"

http_archive(
    name = "rules_jvm_external",
    sha256 = RULES_JVM_EXTERNAL_SHA,
    strip_prefix = "rules_jvm_external-%s" % RULES_JVM_EXTERNAL_TAG,
    url = "https://github.com/bazelbuild/rules_jvm_external/releases/download/%s/rules_jvm_external-%s.tar.gz" % (RULES_JVM_EXTERNAL_TAG, RULES_JVM_EXTERNAL_TAG),
)

load("@rules_jvm_external//:repositories.bzl", "rules_jvm_external_deps")

rules_jvm_external_deps()

load("@rules_jvm_external//:setup.bzl", "rules_jvm_external_setup")

rules_jvm_external_setup()

load("@rules_jvm_external//:defs.bzl", "maven_install")

maven_install(
    # maven_install_json = "//:maven_install.json",
    artifacts = [
        "org.jetbrains.kotlin:kotlin-stdlib:1.9.21",
        "org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.21",
        "org.jetbrains.kotlin:kotlin-serialization:1.9.21",
        "org.jetbrains.kotlinx:kotlinx-datetime:0.5.0",
        "org.jetbrains.kotlinx:kotlinx-serialization-core-jvm:1.6.2",
        "org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2",
        "org.jetbrains.kotlin:kotlin-test:1.9.21",
        "org.junit.jupiter:junit-jupiter-api:5.8.1",
        "org.junit.jupiter:junit-jupiter:5.8.1",
        "io.ktor:ktor-client-core:2.3.7",
        "io.ktor:ktor-client-cio:2.3.7",
        "org.junit.jupiter:junit-jupiter-engine:5.8.1",
    ],
    repositories = [
        "https://maven.google.com",
        "https://repo1.maven.org/maven2",
    ],
    strict_visibility = True,
)

load("@maven//:defs.bzl", "pinned_maven_install")

pinned_maven_install()
