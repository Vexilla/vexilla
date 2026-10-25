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
        public static Feature ReadFeature(JsonElement sourceFeature)
        {
            Validation.Feature(sourceFeature);
            var kind = sourceFeature.GetProperty("featureType").GetString();
            var value = sourceFeature.GetProperty("value");
            Feature feature;
            var subtype = kind == "selective" || kind == "value" ? sourceFeature.GetProperty("valueType").GetString() : "";
            if (subtype == "number")
            {
                subtype = sourceFeature.GetProperty("numberType").GetString() == "int" ? "int" : "double";
            }

            if (kind == "toggle")
            {
                feature = new ToggleFeature { Value = value.GetBoolean() };
            }
            else if (kind == "gradual")
            {
                feature = new GradualFeature { Value = value.GetDouble(), Seed = sourceFeature.GetProperty("seed").GetDouble() };
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
                feature = new SelectiveStringFeature { ValueType = subtype, Value = value.EnumerateArray().Select(item => item.GetString()).ToArray() };
            }
            else if (subtype == "int")
            {
                feature = new SelectiveIntFeature { ValueType = subtype, Value = value.EnumerateArray().Select(item => (long)Validation.Number(item, true)).ToArray() };
            }
            else
            {
                feature = new SelectiveFloatFeature { ValueType = subtype, Value = value.EnumerateArray().Select(item => item.GetDouble()).ToArray() };
            }

            feature.FeatureType = kind;
            feature.FeatureId = sourceFeature.GetProperty("featureId").GetString();
            feature.Name = sourceFeature.GetProperty("name").GetString();
            feature.ScheduleType = sourceFeature.GetProperty("scheduleType").GetString();
            feature.Schedule = ReadSchedule(sourceFeature.GetProperty("schedule"));
            return feature;
        }
        public static Dictionary<string, Feature> ReadFeatures(JsonElement value)
        {
            return value.EnumerateObject().ToDictionary(property => property.Name, property => ReadFeature(property.Value));
        }
        public static Environment ReadEnvironment(JsonElement value)
        {
            var environment = new Environment { Name = value.GetProperty("name").GetString(), EnvironmentId = value.GetProperty("environmentId").GetString(), RawFeatures = ReadFeatures(value.GetProperty("features")) };
            environment.ToggleFeatures = environment.RawFeatures.Where(property => property.Value is ToggleFeature).ToDictionary(property => property.Key, property => (ToggleFeature)property.Value);
            environment.GradualFeatures = environment.RawFeatures.Where(property => property.Value is GradualFeature).ToDictionary(property => property.Key, property => (GradualFeature)property.Value);
            environment.SelectiveFeatures = environment.RawFeatures.Where(property => property.Value is SelectiveFeature).ToDictionary(property => property.Key, property => (SelectiveFeature)property.Value);
            environment.SelectiveStringFeatures = environment.RawFeatures.Where(property => property.Value is SelectiveStringFeature).ToDictionary(property => property.Key, property => (SelectiveStringFeature)property.Value);
            environment.SelectiveIntFeatures = environment.RawFeatures.Where(property => property.Value is SelectiveIntFeature).ToDictionary(property => property.Key, property => (SelectiveIntFeature)property.Value);
            environment.SelectiveFloatFeatures = environment.RawFeatures.Where(property => property.Value is SelectiveFloatFeature).ToDictionary(property => property.Key, property => (SelectiveFloatFeature)property.Value);
            environment.ValueFeatures = environment.RawFeatures.Where(property => property.Value is ValueFeature).ToDictionary(property => property.Key, property => (ValueFeature)property.Value);
            environment.ValueStringFeatures = environment.RawFeatures.Where(property => property.Value is ValueStringFeature).ToDictionary(property => property.Key, property => (ValueStringFeature)property.Value);
            environment.ValueIntFeatures = environment.RawFeatures.Where(property => property.Value is ValueIntFeature).ToDictionary(property => property.Key, property => (ValueIntFeature)property.Value);
            environment.ValueFloatFeatures = environment.RawFeatures.Where(property => property.Value is ValueFloatFeature).ToDictionary(property => property.Key, property => (ValueFloatFeature)property.Value);
            return environment;
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
                Environments = value.GetProperty("environments").EnumerateObject().ToDictionary(property => property.Name, property => ReadEnvironment(property.Value))
            };
        }
        public static Manifest DeserializeManifest(string json)
        {
            var value = Validation.Parse(json, Validation.Manifest);
            return new Manifest { Version = "v1", Groups = value.GetProperty("groups").EnumerateArray().Select(manifestEntry => new ManifestGroup { GroupId = manifestEntry.GetProperty("groupId").GetString(), Name = manifestEntry.GetProperty("name").GetString() }).ToArray() };
        }
        public static object ScheduleWire(Schedule schedule)
        {
            return schedule == null ? null : new
            {
                start = schedule.Start,
                end = schedule.End,
                startTime = schedule.StartTime,
                endTime = schedule.EndTime,
                timeType = schedule.TimeType,
                timezone = schedule.Timezone
            };
        }
        public static Dictionary<string, object> FeatureWire(Feature sourceFeature)
        {
            Validation.Require(sourceFeature != null, "Missing feature");
            var data = new Dictionary<string, object> { { "name", sourceFeature.Name }, { "featureId", sourceFeature.FeatureId }, { "featureType", sourceFeature.FeatureType }, { "scheduleType", sourceFeature.ScheduleType }, { "schedule", ScheduleWire(sourceFeature.Schedule) } };
            string kind, subtype = null;
            object value;
            if (sourceFeature is ToggleFeature toggleFeature)
            {
                kind = "toggle";
                value = toggleFeature.Value;
            }
            else if (sourceFeature is GradualFeature gradualFeature)
            {
                kind = "gradual";
                value = gradualFeature.Value;
                data["seed"] = gradualFeature.Seed;
            }
            else if (sourceFeature is SelectiveStringFeature selectiveStringFeature)
            {
                kind = "selective";
                subtype = "string";
                value = selectiveStringFeature.Value;
            }
            else if (sourceFeature is SelectiveIntFeature selectiveIntFeature)
            {
                kind = "selective";
                subtype = "int";
                value = selectiveIntFeature.Value;
            }
            else if (sourceFeature is SelectiveFloatFeature selectiveFloatFeature)
            {
                kind = "selective";
                subtype = "double";
                value = selectiveFloatFeature.Value;
            }
            else if (sourceFeature is ValueStringFeature valueStringFeature)
            {
                kind = "value";
                subtype = "string";
                value = valueStringFeature.Value;
            }
            else if (sourceFeature is ValueIntFeature valueIntFeature)
            {
                kind = "value";
                subtype = "int";
                value = valueIntFeature.Value;
            }
            else if (sourceFeature is ValueFloatFeature valueFloatFeature)
            {
                kind = "value";
                subtype = "double";
                value = valueFloatFeature.Value;
            }
            else
            {
                throw new ContractException("validation", "Full feature subtype required");
            }

            Validation.Require(sourceFeature.FeatureType == kind, "Native feature discriminator differs from subtype");
            if (subtype != null)
            {
                var declared = sourceFeature is ValueFeature valueFeature ? valueFeature.ValueType : ((SelectiveFeature)sourceFeature).ValueType;
                Validation.Require(declared == subtype, "Native value subtype mismatch");
                data["valueType"] = subtype == "string" ? "string" : "number";
                if (subtype != "string")
                {
                    data["numberType"] = subtype == "int" ? "int" : "float";
                }
            }
            data["value"] = value;
            return data;
        }
        private static Dictionary<string, object> FeaturesWire(Dictionary<string, Feature> features)
        {
            return features == null ? null : features.ToDictionary(property => property.Key, property => (object)FeatureWire(property.Value));
        }
        private static object EnvironmentWire(Environment environment)
        {
            Validation.Require(environment != null, "Missing environment");
            var features = FeaturesWire(environment.RawFeatures);
            // Parallel public typed maps may not bypass validation by diverging
            // from RawFeatures after a caller mutates or replaces an entry.
            foreach (var field in typeof(Environment).GetFields().Where(field => field.Name.EndsWith("Features") && field.Name != "RawFeatures"))
            {
                var map = field.GetValue(environment) as System.Collections.IDictionary;
                if (map == null)
                {
                    continue;
                }

                foreach (System.Collections.DictionaryEntry property in map)
                {
                    var wire = FeatureWire((Feature)property.Value);
                    Validation.Require(features != null && features.TryGetValue((string)property.Key, out var original) && JsonSerializer.Serialize(wire) == JsonSerializer.Serialize(original), "Conflicting native environment feature maps");
                }
            }
            return new
            {
                name = environment.Name,
                environmentId = environment.EnvironmentId,
                features
            };
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
                    meta = group.Meta == null ? null : new
                    {
                        version = group.Meta.Version
                    },
                    features = FeaturesWire(group.Features),
                    environments = group.Environments == null ? null : group.Environments.ToDictionary(property => property.Key, property => EnvironmentWire(property.Value))
                });
            }
            catch (ArgumentException e) { throw new ContractException("validation", e.Message); }
        }
        public static string Serialize(Manifest manifest)
        {
            Validation.NativeUnicode(manifest);
            Validation.Require(manifest != null, "Missing manifest");
            return JsonSerializer.Serialize(new
            {
                version = manifest.Version,
                groups = manifest.Groups == null ? null : manifest.Groups.Select(manifestEntry => { Validation.Require(manifestEntry != null, "Missing manifest group"); return new { groupId = manifestEntry.GroupId, name = manifestEntry.Name }; }).ToArray()
            });
        }
    }
}
