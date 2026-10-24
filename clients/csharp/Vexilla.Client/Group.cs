using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Vexilla.Client
{
    public class GroupConverter
    {
        public static Schedule ReadSchedule(JsonElement value)
        {
            Validation.Schedule(value);
            return new Schedule
            {
                Start = (long)Validation.Number(value.GetProperty("start"), true),
                End = (long)Validation.Number(value.GetProperty("end"), true),
                StartTime = (long)Validation.Number(value.GetProperty("startTime"), true),
                EndTime = (long)Validation.Number(value.GetProperty("endTime"), true),
                TimeType = value.GetProperty("timeType").GetString(),
                Timezone = value.GetProperty("timezone").GetString()
            };
        }
        public static Feature ReadFeature(JsonElement f)
        {
            Validation.Feature(f);
            var kind = f.GetProperty("featureType").GetString(); var value = f.GetProperty("value"); Feature feature;
            var subtype = kind == "selective" || kind == "value" ? f.GetProperty("valueType").GetString() : "";
            if (subtype == "number")
            {
                subtype = f.GetProperty("numberType").GetString() == "int" ? "int" : "double";
            }

            if (kind == "toggle")
            {
                feature = new ToggleFeature { Value = value.GetBoolean() };
            }
            else if (kind == "gradual")
            {
                feature = new GradualFeature { Value = value.GetDouble(), Seed = f.GetProperty("seed").GetDouble() };
            }
            else if (kind == "value" && subtype == "string")
            {
                feature = new ValueStringFeature { ValueType = subtype, Value = value.GetString() };
            }
            else if (kind == "value" && subtype == "int")
            {
                feature = new ValueIntFeature { ValueType = subtype, Value = (long)Validation.Number(value, true) };
            }
            else if (kind == "value")
            {
                feature = new ValueFloatFeature { ValueType = subtype, Value = value.GetDouble() };
            }
            else if (subtype == "string")
            {
                feature = new SelectiveStringFeature { ValueType = subtype, Value = value.EnumerateArray().Select(v => v.GetString()).ToArray() };
            }
            else if (subtype == "int")
            {
                feature = new SelectiveIntFeature { ValueType = subtype, Value = value.EnumerateArray().Select(v => (long)Validation.Number(v, true)).ToArray() };
            }
            else
            {
                feature = new SelectiveFloatFeature { ValueType = subtype, Value = value.EnumerateArray().Select(v => v.GetDouble()).ToArray() };
            }

            feature.FeatureType = kind; feature.FeatureId = f.GetProperty("featureId").GetString(); feature.Name = f.GetProperty("name").GetString();
            feature.ScheduleType = f.GetProperty("scheduleType").GetString(); feature.Schedule = ReadSchedule(f.GetProperty("schedule")); return feature;
        }
        public static Dictionary<string, Feature> ReadFeatures(JsonElement value)
        { return value.EnumerateObject().ToDictionary(p => p.Name, p => ReadFeature(p.Value)); }
        public static Environment ReadEnvironment(JsonElement value)
        {
            var env = new Environment { Name = value.GetProperty("name").GetString(), EnvironmentId = value.GetProperty("environmentId").GetString(), RawFeatures = ReadFeatures(value.GetProperty("features")) };
            env.ToggleFeatures = env.RawFeatures.Where(p => p.Value is ToggleFeature).ToDictionary(p => p.Key, p => (ToggleFeature)p.Value);
            env.GradualFeatures = env.RawFeatures.Where(p => p.Value is GradualFeature).ToDictionary(p => p.Key, p => (GradualFeature)p.Value);
            env.SelectiveFeatures = env.RawFeatures.Where(p => p.Value is SelectiveFeature).ToDictionary(p => p.Key, p => (SelectiveFeature)p.Value);
            env.SelectiveStringFeatures = env.RawFeatures.Where(p => p.Value is SelectiveStringFeature).ToDictionary(p => p.Key, p => (SelectiveStringFeature)p.Value);
            env.SelectiveIntFeatures = env.RawFeatures.Where(p => p.Value is SelectiveIntFeature).ToDictionary(p => p.Key, p => (SelectiveIntFeature)p.Value);
            env.SelectiveFloatFeatures = env.RawFeatures.Where(p => p.Value is SelectiveFloatFeature).ToDictionary(p => p.Key, p => (SelectiveFloatFeature)p.Value);
            env.ValueFeatures = env.RawFeatures.Where(p => p.Value is ValueFeature).ToDictionary(p => p.Key, p => (ValueFeature)p.Value);
            env.ValueStringFeatures = env.RawFeatures.Where(p => p.Value is ValueStringFeature).ToDictionary(p => p.Key, p => (ValueStringFeature)p.Value);
            env.ValueIntFeatures = env.RawFeatures.Where(p => p.Value is ValueIntFeature).ToDictionary(p => p.Key, p => (ValueIntFeature)p.Value);
            env.ValueFloatFeatures = env.RawFeatures.Where(p => p.Value is ValueFloatFeature).ToDictionary(p => p.Key, p => (ValueFloatFeature)p.Value);
            return env;
        }
        public static Group Deserialize(string jsonString)
        {
            var value = Validation.Parse(jsonString, Validation.Group);
            return new Group
            {
                Name = value.GetProperty("name").GetString(),
                GroupId = value.GetProperty("groupId").GetString(),
                Meta = new GroupMeta { Version = "v1" },
                Features = ReadFeatures(value.GetProperty("features")),
                Environments = value.GetProperty("environments").EnumerateObject().ToDictionary(p => p.Name, p => ReadEnvironment(p.Value))
            };
        }
        public static Manifest DeserializeManifest(string json)
        {
            var value = Validation.Parse(json, Validation.Manifest);
            return new Manifest { Version = "v1", Groups = value.GetProperty("groups").EnumerateArray().Select(g => new ManifestGroup { GroupId = g.GetProperty("groupId").GetString(), Name = g.GetProperty("name").GetString() }).ToArray() };
        }
        public static object ScheduleWire(Schedule s)
        { return s == null ? null : new { start = s.Start, end = s.End, startTime = s.StartTime, endTime = s.EndTime, timeType = s.TimeType, timezone = s.Timezone }; }
        public static Dictionary<string, object> FeatureWire(Feature f)
        {
            Validation.Require(f != null, "Missing feature");
            var data = new Dictionary<string, object> { { "name", f.Name }, { "featureId", f.FeatureId }, { "featureType", f.FeatureType }, { "scheduleType", f.ScheduleType }, { "schedule", ScheduleWire(f.Schedule) } };
            string kind, subtype = null; object value;
            if (f is ToggleFeature t) { kind = "toggle"; value = t.Value; }
            else if (f is GradualFeature g) { kind = "gradual"; value = g.Value; data["seed"] = g.Seed; }
            else if (f is SelectiveStringFeature ss) { kind = "selective"; subtype = "string"; value = ss.Value; }
            else if (f is SelectiveIntFeature si) { kind = "selective"; subtype = "int"; value = si.Value; }
            else if (f is SelectiveFloatFeature sf) { kind = "selective"; subtype = "double"; value = sf.Value; }
            else if (f is ValueStringFeature vs) { kind = "value"; subtype = "string"; value = vs.Value; }
            else if (f is ValueIntFeature vi) { kind = "value"; subtype = "int"; value = vi.Value; }
            else if (f is ValueFloatFeature vf) { kind = "value"; subtype = "double"; value = vf.Value; }
            else
            {
                throw new ContractException("validation", "Full feature subtype required");
            }

            Validation.Require(f.FeatureType == kind, "Native feature discriminator differs from subtype");
            if (subtype != null)
            {
                var declared = f is ValueFeature v ? v.ValueType : ((SelectiveFeature)f).ValueType;
                Validation.Require(declared == subtype, "Native value subtype mismatch");
                data["valueType"] = subtype == "string" ? "string" : "number";
                if (subtype != "string")
                {
                    data["numberType"] = subtype == "int" ? "int" : "float";
                }
            }
            data["value"] = value; return data;
        }
        private static Dictionary<string, object> FeaturesWire(Dictionary<string, Feature> features)
        { return features == null ? null : features.ToDictionary(p => p.Key, p => (object)FeatureWire(p.Value)); }
        private static object EnvironmentWire(Environment env)
        {
            Validation.Require(env != null, "Missing environment");
            var features = FeaturesWire(env.RawFeatures);
            // Parallel public typed maps may not bypass validation by diverging
            // from RawFeatures after a caller mutates or replaces an entry.
            foreach (var field in typeof(Environment).GetFields().Where(f => f.Name.EndsWith("Features") && f.Name != "RawFeatures"))
            {
                var map = field.GetValue(env) as System.Collections.IDictionary;
                if (map == null)
                {
                    continue;
                }

                foreach (System.Collections.DictionaryEntry p in map)
                {
                    var wire = FeatureWire((Feature)p.Value);
                    Validation.Require(features != null && features.TryGetValue((string)p.Key, out var original) && JsonSerializer.Serialize(wire) == JsonSerializer.Serialize(original), "Conflicting native environment feature maps");
                }
            }
            return new { name = env.Name, environmentId = env.EnvironmentId, features };
        }
        public static string Serialize(Group group)
        {
            Validation.NativeUnicode(group);
            Validation.Require(group != null, "Missing group");
            try
            {
                return JsonSerializer.Serialize(new
                {
                    groupId = group.GroupId,
                    name = group.Name,
                    meta = group.Meta == null ? null : new { version = group.Meta.Version },
                    features = FeaturesWire(group.Features),
                    environments = group.Environments == null ? null : group.Environments.ToDictionary(p => p.Key, p => EnvironmentWire(p.Value))
                });
            }
            catch (ArgumentException e) { throw new ContractException("validation", e.Message); }
        }
        public static string Serialize(Manifest manifest)
        {
            Validation.NativeUnicode(manifest); Validation.Require(manifest != null, "Missing manifest");
            return JsonSerializer.Serialize(new { version = manifest.Version, groups = manifest.Groups == null ? null : manifest.Groups.Select(g => { Validation.Require(g != null, "Missing manifest group"); return new { groupId = g.GroupId, name = g.Name }; }).ToArray() });
        }
    }
}
