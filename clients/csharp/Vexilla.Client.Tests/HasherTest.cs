using Xunit;
using Xunit.Abstractions;

namespace Vexilla.Client.Tests
{
    public class HasherTest
    {
        private const double NonWorkingSeed = 0.22;
        private const string Uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
        private const double WorkingSeed = 0.11;
        private readonly ITestOutputHelper _output;

        public HasherTest(ITestOutputHelper output)
        {
            _output = output;
        }

        [Fact]
        public void TestWorkingGradual()
        {
            var result = VexillaHasher.HashString(Uuid, WorkingSeed);

            _output.WriteLine("result");
            _output.WriteLine(result.ToString());

            Assert.True(result <= 0.4);
        }

        [Fact]
        public void TestNonWorkingGradual()
        {
            var result = VexillaHasher.HashString(Uuid, NonWorkingSeed);

            _output.WriteLine("result");
            _output.WriteLine(result.ToString());

            Assert.True(result >= 0.4);
        }
    }
}