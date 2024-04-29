load(
    "@rules_dotnet//dotnet:defs.bzl",
    "csharp_library",
    "csharp_nunit_test",
)

csharp_library(
    name = "lib",
    srcs = [
        "Vexilla.Client/Client.cs",
        "Vexilla.Client/EnvironmentJsonConverter.cs",
        "Vexilla.Client/Exception.cs",
        "Vexilla.Client/Group.cs",
        "Vexilla.Client/Hasher.cs",
        "Vexilla.Client/Scheduler.cs",
        "Vexilla.Client/Types.cs",
    ],
    internals_visible_to = ["lib_test"],
    target_frameworks = ["netstandard2.0"],
    targeting_packs = [
        "@paket.main//netstandard.library",
    ],
    deps = [
        "@paket.main//system.memory",
        "@paket.main//system.text.json",
    ],
)

csharp_nunit_test(
    name = "lib_test",
    srcs = [
        "Vexilla.Client.Tests/ClientTest.cs",
        "Vexilla.Client.Tests/HasherTest.cs",
        "Vexilla.Client.Tests/SchedulerTest.cs",
    ],
    target_frameworks = ["net6.0"],
    targeting_packs = [
        "@paket.main//microsoft.netcore.app.ref",
    ],
    deps = [
        ":lib",
        "@paket.main//microsoft.net.test.sdk",
        "@paket.main//nunit",
        "@paket.main//nunit.analyzers",
        "@paket.main//nunit3testadapter",
        "@paket.main//system.runtime",
        "@paket.main//system.threading",
        "@paket.main//system.threading.tasks",
        "@paket.main//system.threading.tasks.extensions",
    ],
)
