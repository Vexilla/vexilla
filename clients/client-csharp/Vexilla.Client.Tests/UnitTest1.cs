using System;
using Xunit;
using System.Threading.Tasks;
using Xunit.Abstractions;
using Newtonsoft.Json.Linq;
using System.Net.Http;

namespace Vexilla.Client.Tests
{
    public class HasherTest
    {
        private readonly ITestOutputHelper output;

        public HasherTest(ITestOutputHelper output)
        {
            this.output = output;
        }
        private String uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
        private Double workingSeed = 0.11;
        private Double nonWorkingSeed = 0.22;

        [Fact]
        public void TestWorkingGradual()
        {
            VexillaHasher hasher = new VexillaHasher(this.workingSeed);

            Double result = hasher.hashString(this.uuid);

            output.WriteLine("result");
            output.WriteLine(result.ToString());

            Assert.True(hasher.hashString(this.uuid) <= 40);
        }

        [Fact]
        public void TestNonWorkingGradual()
        {
            VexillaHasher hasher = new VexillaHasher(nonWorkingSeed);

            Double result = hasher.hashString(uuid);

            output.WriteLine("result");
            output.WriteLine(result.ToString());

            Assert.True(hasher.hashString(uuid) >= 40);
        }
    }

    public class ClientTest
    {

        private readonly ITestOutputHelper output;

        public ClientTest(ITestOutputHelper output)
        {
            this.output = output;
        }

        [Fact]
        public async Task ClientWorksTest()
        {
            VexillaClientBase client = new VexillaClientBase(
                "https://streamparrot-feature-flags.s3.amazonaws.com",
                "dev",
                "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
            );

            JObject flags = await client.FetchFlags("features.json", async (baseUrl, fileName) =>
            {
                var httpClient = new HttpClient();

                 var result = await httpClient.GetAsync(
                    baseUrl + "/" + fileName
                 );

                var content = await result.Content.ReadAsStringAsync();
                var config = JObject.Parse(content);

                return config;
            });
            client.setFlags(flags);

            Assert.True(client.should("testingWorkingGradual"));
            Assert.False(client.should("testingNonWorkingGradual"));

            var httpClient = new HttpClient();
            JObject clientFlags = await client.FetchFlags("features.json", httpClient);
            client.setFlags(clientFlags);

            Assert.True(client.should("testingWorkingGradual"));
            Assert.False(client.should("testingNonWorkingGradual"));
        }
    }
 
}
