# Swift/Cocoa
# bazel_dep(
#     name = "rules_swift",
#     version = "1.7.1",
#     repo_name = "build_bazel_rules_swift",
# )
# bazel_dep(
#     name = "rules_swift_package_manager",
#     version = "0.4.2",
# )
# bazel_dep(
#     name = "rules_apple",
#     version = "2.1.0",
#     repo_name = "build_bazel_rules_apple",
# )

# CSharp (See WORKSPACE)
# Dart (See WORKSPACE)
# Elixir (No Bazel support)

# Go
bazel_dep(name = "rules_go", version = "0.39.1")
bazel_dep(name = "gazelle", version = "0.29.0")

# JS (See WORKSPACE)
# Kotlin (See WORKSPACE)
# Lua (No Bazel support)

# Rust (See WORKSPACE)
