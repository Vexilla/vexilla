using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Vexilla.Client
{
    public static class Compatibility
    {
        private static readonly JsonDocument Data = Load();
        private static readonly HashSet<string> Timezones = new HashSet<string>(
            Data.RootElement.GetProperty("timezone").GetProperty("identifiers").EnumerateArray().Select(v => AsciiLower(v.GetString())), StringComparer.Ordinal);
        private static readonly Regex Offset = new Regex(Data.RootElement.GetProperty("timezone").GetProperty("offsetPattern").GetString(), RegexOptions.CultureInvariant);
        private static JsonDocument Load()
        {
            using (var stream = typeof(Compatibility).Assembly.GetManifestResourceStream("compatibility.json"))
            {
                if (stream == null)
                {
                    throw new InvalidOperationException("Missing pinned compatibility resource");
                }

                return JsonDocument.Parse(stream);
            }
        }
        public static bool IsUnicode(string text)
        {
            if (text == null)
            {
                return false;
            }

            for (var i = 0; i < text.Length; i++)
            {
                if (char.IsHighSurrogate(text[i]))
                {
                    if (++i >= text.Length || !char.IsLowSurrogate(text[i]))
                    {
                        return false;
                    }
                }
                else if (char.IsLowSurrogate(text[i]))
                {
                    return false;
                }
            }
            return true;
        }
        private static string AsciiLower(string text) { return new string(text.Select(c => c >= 'A' && c <= 'Z' ? (char)(c + 32) : c).ToArray()); }
        public static bool Timezone(string text)
        {
            if (text == null)
            {
                return false;
            }

            var match = Offset.Match(text);
            return Timezones.Contains(AsciiLower(text)) || match.Success && match.Index == 0 && match.Length == text.Length;
        }
        private static bool InRanges(int code, string field)
        {
            var ranges = Data.RootElement.GetProperty("unicode").GetProperty(field);
            var first = 0; var last = ranges.GetArrayLength() - 1;
            while (first <= last)
            {
                var mid = (first + last) / 2;
                if (code < ranges[mid][0].GetInt32())
                {
                    last = mid - 1;
                }
                else if (code > ranges[mid][1].GetInt32())
                {
                    first = mid + 1;
                }
                else
                {
                    return true;
                }
            }
            return false;
        }
        private static string Lower(string text)
        {
            var chars = new List<int>();
            for (var i = 0; i < text.Length; i++)
            {
                chars.Add(char.ConvertToUtf32(text, i)); if (char.IsHighSurrogate(text[i]))
                {
                    i++;
                }
            }
            var output = new StringBuilder();
            var lower = Data.RootElement.GetProperty("unicode").GetProperty("lower");
            for (var i = 0; i < chars.Count; i++)
            {
                var key = char.ConvertFromUtf32(chars[i]);
                if (chars[i] == 0x03a3)
                {
                    var before = i - 1; var after = i + 1;
                    while (before >= 0 && InRanges(chars[before], "ignorableRanges"))
                    {
                        before--;
                    }

                    while (after < chars.Count && InRanges(chars[after], "ignorableRanges"))
                    {
                        after++;
                    }

                    output.Append(before >= 0 && InRanges(chars[before], "casedRanges") && (after == chars.Count || !InRanges(chars[after], "casedRanges")) ? "ς" : "σ");
                }
                else
                {
                    output.Append(lower.TryGetProperty(key, out var mapped) ? mapped.GetString() : key);
                }
            }
            return output.ToString();
        }
        public static string Normalize(string text)
        {
            if (!IsUnicode(text))
            {
                throw new ContractException("validation", "Malformed Unicode name");
            }

            const string upper = "A-ZÀ-ÖØ-Þ";
            const string symbols = "\\x20-\\x26\\x28-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\x7e\\xa0-\\xbf×÷";
            if (!Regex.IsMatch(text, "[a-zß-öø-ÿ]"))
            {
                text = Lower(text);
            }

            if (!Regex.IsMatch(text, "[" + symbols + "]"))
            {
                text = Regex.Replace(text, "([^" + upper + "])([" + upper + "]*)([" + upper + "])(?=[^" + upper + "]|$)", m => m.Groups[1].Value + " " + (m.Groups[2].Length > 0 ? m.Groups[2].Value + " " : "") + m.Groups[3].Value);
            }

            return Regex.Replace(Lower(text), "[" + symbols + "]+(.|$)", m => m.Groups[1].Length > 0 ? "-" + m.Groups[1].Value : "", RegexOptions.Singleline).Replace("'", "");
        }
    }
    public class ContractException : Exception
    {
        public string Kind { get; private set; }
        public ContractException(string kind, string message) : base(message) { Kind = kind; }
    }
}
