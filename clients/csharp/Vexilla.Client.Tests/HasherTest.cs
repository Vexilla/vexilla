using NUnit.Framework;

namespace Vexilla.Client.Tests
{
    [TestFixture]
    public class HasherTest
    {
        private const double NonWorkingSeed = 0.22;
        private const string Uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
        private const double WorkingSeed = 0.32;

        [Test]
        public void TestWorkingGradual()
        {
            var result = VexillaHasher.HashString(Uuid, WorkingSeed);
            Assert.True(result <= 0.4);
        }

        [Test]
        public void TestNonWorkingGradual()
        {
            var result = VexillaHasher.HashString(Uuid, NonWorkingSeed);
            Assert.True(result >= 0.4);
        }
    }
}
