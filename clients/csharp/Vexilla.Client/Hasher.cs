using System;
using System.Globalization;
using System.Linq;

namespace Vexilla.Client
{
    public class VexillaHasher
    {
        public static double HashString(string stringToHash, double seed)
        {
            var sum = stringToHash
                .ToCharArray()
                .Select(character => (int)character)
                .Aggregate((x, y) => x + y);

            return Math.Floor(sum * seed * 42) % 100 / 100;
        }

        public static double HashInt(long intToHash, double seed)
        {
            var stringToHash = intToHash.ToString();
            return HashString(stringToHash, seed);
        }

        public static double HashFloat(double floatToHash, double seed)
        {
            var stringToHash =
                floatToHash.ToString(CultureInfo.InvariantCulture);
            return HashString(stringToHash, seed);
        }
    }
}