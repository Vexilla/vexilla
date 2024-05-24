using System;
using System.Globalization;

namespace Vexilla.Client
{
    public class VexillaHasher
    {

        private const uint FNV32_OFFSET_BASIS = 2166136261;
        private const uint FNV32_PRIME = 16777619;

        public static double HashString(string stringToHash, double seed)
        {
            var total = FNV32_OFFSET_BASIS;
            var byteArray = System.Text.Encoding.UTF8.GetBytes(stringToHash);

            var length = byteArray.Length;

            for (var i = 0; i < length; i++)
            {
                var byteChar = byteArray[i];
                total = total ^ byteChar;
                total = total * FNV32_PRIME;
            }

            return total * seed % 1000 / 1000;
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