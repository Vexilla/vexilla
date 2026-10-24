using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;

namespace Vexilla.Client
{
    public static class Validation
    {
        public static void Require(bool condition, string message)
        {
            if (!condition)
            {
                throw new ContractException("validation", message);
            }
        }
        public static JsonElement Field(JsonElement value, string name)
        {
            Require(value.ValueKind == JsonValueKind.Object && value.TryGetProperty(name, out _), "Missing required field: " + name);
            return value.GetProperty(name);
        }
        public static string Text(JsonElement value, bool nonempty = false)
        {
            Require(value.ValueKind == JsonValueKind.String, "Expected a string");
            var text = value.GetString();
            Require(Compatibility.IsUnicode(text) && (!nonempty || text.Length > 0), "Expected a Unicode string");
            return text;
        }
        public static double Number(JsonElement value, bool integer = false)
        {
            Require(value.ValueKind == JsonValueKind.Number, "Expected a number");
            var number = value.GetDouble();
            Require(!double.IsNaN(number) && !double.IsInfinity(number) && (!integer || Math.Truncate(number) == number && Math.Abs(number) <= 9007199254740991), "Invalid finite/safe integer number");
            return number;
        }
        private static void Object(JsonElement value) { Require(value.ValueKind == JsonValueKind.Object, "Expected an object"); }
        private static void Enum(JsonElement value, params string[] allowed) { Require(allowed.Contains(Text(value)), "Unsupported enum"); }
        private static bool SamePrimitive(JsonElement a, JsonElement b)
        {
            if (a.ValueKind != b.ValueKind)
            {
                return false;
            }

            if (a.ValueKind == JsonValueKind.String)
            {
                return a.GetString() == b.GetString();
            }

            if (a.ValueKind == JsonValueKind.Number)
            {
                return a.GetDouble() == b.GetDouble();
            }

            return a.ValueKind == JsonValueKind.Null || a.ValueKind == JsonValueKind.True || a.ValueKind == JsonValueKind.False;
        }
        private static string SafeId(JsonElement value)
        {
            var id = Text(value, true);
            Require(!new[] { "manifest", "config", ".", ".." }.Contains(id) && id.IndexOfAny(new[] { '/', '\\', '\0' }) < 0, "Unsafe group file identifier");
            return id;
        }
        public static void AddAlias(Dictionary<string, string> aliases, string id, string name)
        {
            foreach (var key in new[] { id, name, Compatibility.Normalize(name) })
            {
                Require(!aliases.TryGetValue(key, out var existing) || existing == id, "Alias shadows another ID/name");
                aliases[key] = id;
            }
        }
        private static void Unicode(JsonElement value)
        {
            if (value.ValueKind == JsonValueKind.String)
            {
                Text(value);
            }
            else if (value.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in value.EnumerateArray())
                {
                    Unicode(item);
                }
            }
            else if (value.ValueKind == JsonValueKind.Object)
            {
                foreach (var p in value.EnumerateObject())
                { Require(Compatibility.IsUnicode(p.Name), "Malformed Unicode key"); Unicode(p.Value); }
            }
        }
        public static void NativeUnicode(object value)
        {
            var seen = new HashSet<object>();
            Action<object> visit = null;
            visit = item =>
            {
                if (item == null)
                {
                    return;
                }

                if (item is string text) { Require(Compatibility.IsUnicode(text), "Malformed native Unicode"); return; }
                if (item.GetType().IsPrimitive || !seen.Add(item))
                {
                    return;
                }

                if (item is IDictionary dict)
                {
                    foreach (DictionaryEntry entry in dict) { visit(entry.Key); visit(entry.Value); }
                }
                else if (item is IEnumerable array)
                {
                    foreach (var element in array)
                    {
                        visit(element);
                    }
                }
                else
                {
                    foreach (var field in item.GetType().GetFields(BindingFlags.Public | BindingFlags.Instance))
                    {
                        visit(field.GetValue(item));
                    }
                }
            };
            visit(value);
        }
        public static JsonElement Parse(string json, Action<JsonElement> validate)
        {
            try
            {
                using (var document = JsonDocument.Parse(json))
                {
                    Unicode(document.RootElement);
                    validate(document.RootElement);
                    return document.RootElement.Clone();
                }
            }
            catch (ContractException) { throw; }
            catch (Exception e) when (e is JsonException || e is InvalidOperationException || e is ArgumentException || e is FormatException || e is OverflowException || e is KeyNotFoundException)
            { throw new ContractException("validation", "Invalid v1 JSON: " + e.Message); }
        }
        public static void Schedule(JsonElement value)
        {
            Object(value);
            foreach (var key in new[] { "start", "end", "startTime", "endTime" })
            {
                Number(Field(value, key), true);
            }

            Enum(Field(value, "timeType"), "none", "start/end", "daily");
            Require(Compatibility.Timezone(Text(Field(value, "timezone"), true)), "Invalid timezone");
        }
        public static void Feature(JsonElement value)
        {
            Object(value); Text(Field(value, "name")); Text(Field(value, "featureId"), true);
            Enum(Field(value, "scheduleType"), "", "global", "environment"); Schedule(Field(value, "schedule"));
            var kind = Text(Field(value, "featureType"));
            var data = Field(value, "value");
            if (kind == "toggle")
            {
                Require(data.ValueKind == JsonValueKind.True || data.ValueKind == JsonValueKind.False, "Toggle must be boolean");
            }
            else if (kind == "gradual")
            {
                Number(data); var seed = Number(Field(value, "seed"));
                Require(seed > 0 && seed <= 1, "seed must satisfy 0 < seed <= 1");
            }
            else
            {
                Require(kind == "selective" || kind == "value", "Unknown featureType");
                Enum(Field(value, "valueType"), "string", "number");
                var numeric = Text(Field(value, "valueType")) == "number";
                var integer = false;
                if (numeric) { Enum(Field(value, "numberType"), "int", "float"); integer = Text(Field(value, "numberType")) == "int"; }
                Action<JsonElement> item = v =>
                {
                    if (numeric)
                    {
                        Number(v, integer);
                    }
                    else
                    {
                        Text(v);
                    }
                };
                if (kind == "selective")
                {
                    Require(data.ValueKind == JsonValueKind.Array, "Selective value must be an array");
                    foreach (var v in data.EnumerateArray())
                    {
                        item(v);
                    }
                }
                else
                {
                    item(data);
                }
            }
        }
        private static JsonElement Features(JsonElement value)
        {
            Object(value); var aliases = new Dictionary<string, string>();
            foreach (var p in value.EnumerateObject())
            {
                Feature(p.Value); Require(Text(Field(p.Value, "featureId"), true) == p.Name, "featureId must match map key");
                AddAlias(aliases, p.Name, Text(Field(p.Value, "name")));
            }
            return value;
        }
        public static void Manifest(JsonElement value)
        {
            Object(value); Require(Text(Field(value, "version")) == "v1", "Manifest version must be v1");
            var groups = Field(value, "groups"); Require(groups.ValueKind == JsonValueKind.Array, "groups must be an array");
            var ids = new HashSet<string>(); var aliases = new Dictionary<string, string>();
            foreach (var group in groups.EnumerateArray())
            {
                var id = SafeId(Field(group, "groupId"));
                Require(ids.Add(id), "Duplicate group ID"); AddAlias(aliases, id, Text(Field(group, "name")));
            }
        }
        public static void Environment(JsonElement value)
        {
            Object(value); Text(Field(value, "name")); Text(Field(value, "environmentId"), true);
            Features(Field(value, "features"));
        }
        public static void Group(JsonElement value)
        {
            Object(value); SafeId(Field(value, "groupId")); Text(Field(value, "name"));
            Require(Text(Field(Field(value, "meta"), "version")) == "v1", "Group version must be v1");
            var defaults = Features(Field(value, "features"));
            var environments = Field(value, "environments"); Object(environments); var aliases = new Dictionary<string, string>();
            foreach (var env in environments.EnumerateObject())
            {
                Require(Text(Field(env.Value, "environmentId"), true) == env.Name, "environmentId must match map key");
                AddAlias(aliases, env.Name, Text(Field(env.Value, "name")));
                var features = Features(Field(env.Value, "features"));
                Require(features.EnumerateObject().Count() == defaults.EnumerateObject().Count(), "Environment feature set differs");
                foreach (var f in features.EnumerateObject())
                {
                    Require(defaults.TryGetProperty(f.Name, out var original), "Environment feature not in group");
                    foreach (var key in new[] { "name", "featureType", "valueType", "numberType" })
                    {
                        var a = f.Value.TryGetProperty(key, out var av); var b = original.TryGetProperty(key, out var bv);
                        Require(a == b && (!a || SamePrimitive(av, bv)), "Environment feature identity/subtype differs");
                    }
                }
            }
        }
    }
}
