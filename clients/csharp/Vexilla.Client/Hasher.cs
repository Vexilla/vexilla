using System;
using System.Globalization;
using System.Text;

namespace Vexilla.Client
{
    public class VexillaHasher
    {
        public static uint HashFnv32a(string text)
        {
            if (!Compatibility.IsUnicode(text))
            {
                throw new ContractException("instance", "Instance ID must contain Unicode scalar values");
            }

            uint hash = 2166136261;
            foreach (var value in Encoding.UTF8.GetBytes(text))
            {
                hash = unchecked((hash ^ value) * 16777619);
            }

            return hash;
        }
        public static string InstanceText(object value)
        {
            if (value is string text && Compatibility.IsUnicode(text))
            {
                return text;
            }

            double number;
            if (value is long integer)
            {
                number = integer;
                if (number.ToString("F0", CultureInfo.InvariantCulture) != integer.ToString(CultureInfo.InvariantCulture))
                {
                    throw new ContractException("instance", "Integer ID is not exactly binary64");
                }
            }
            else if (value is int small)
            {
                number = small;
            }
            else if (value is double floating)
            {
                number = floating;
            }
            else
            {
                throw new ContractException("instance", "A finite numeric or string instance ID is required");
            }

            if (double.IsNaN(number) || double.IsInfinity(number))
            {
                throw new ContractException("instance", "Finite instance ID required");
            }

            if (number == 0)
            {
                return "0";
            }

            var sign = number < 0 ? "-" : "";
            var parts = Math.Abs(number).ToString("R", CultureInfo.InvariantCulture).ToLowerInvariant().Split('e');
            var point = parts[0].IndexOf('.');
            if (point < 0)
            {
                point = parts[0].Length;
            }

            if (parts.Length > 1)
            {
                point += int.Parse(parts[1], CultureInfo.InvariantCulture);
            }

            var digits = parts[0].Replace(".", "");
            while (digits[0] == '0') { digits = digits.Substring(1); point--; }
            digits = digits.TrimEnd('0');
            if (point > 0 && point <= 21)
            {
                return sign + (digits.Length <= point ? digits + new string('0', point - digits.Length) : digits.Insert(point, "."));
            }

            if (point > -6 && point <= 0)
            {
                return sign + "0." + new string('0', -point) + digits;
            }

            var exponent = point - 1;
            return sign + digits[0] + (digits.Length > 1 ? "." + digits.Substring(1) : "") + "e" + (exponent >= 0 ? "+" : "-") + Math.Abs(exponent).ToString(CultureInfo.InvariantCulture);
        }
        public static double HashString(string stringToHash, double seed) { return (HashFnv32a(stringToHash) * seed % 1000.0) / 1000.0; }
        public static double HashInt(long intToHash, double seed) { return HashString(InstanceText(intToHash), seed); }
        public static double HashFloat(double floatToHash, double seed) { return HashString(InstanceText(floatToHash), seed); }
    }
}
