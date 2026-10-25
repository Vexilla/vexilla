using System;
using System.IO;
using System.Threading.Tasks;
using NUnit.Framework;
using Vexilla.Client;

[TestFixture, NonParallelizable]
public class LoggingTests
{
    [Test]
    public async Task DiagnosticsAreOptInAndPreserveFailures()
    {
        var originalErrorWriter = Console.Error;
        try
        {
            foreach (var showLogs in new[] { false, true })
            {
                var diagnostics = new StringWriter();
                Console.SetError(diagnostics);
                var client = new VexillaClientBase("https://private-token@contract", "prod", "private-instance", showLogs);
                var manifest = await client.GetManifest(_ => Task.FromResult("{\"version\":\"v1\",\"groups\":[]}"));
                client.SetManifest(manifest);
                Assert.ThrowsAsync<ContractException>(async () => await client.GetManifest(_ => throw new Exception("private-callback-error")));
                manifest.Version = "invalid";
                Assert.Throws<ContractException>(() => client.SetManifest(manifest));
                var output = diagnostics.ToString();
                if (!showLogs)
                {
                    Assert.That(output, Is.Empty);
                    continue;
                }
                foreach (var expected in new[] { "manifest.fetch outcome=success", "manifest.install outcome=success", "manifest.fetch outcome=failure", "manifest.install outcome=failure" })
                {
                    StringAssert.Contains(expected, output);
                }
                StringAssert.DoesNotContain("private-", output);
            }
        }
        finally
        {
            Console.SetError(originalErrorWriter);
        }
    }
}
