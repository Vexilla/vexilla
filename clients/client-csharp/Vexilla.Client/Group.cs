using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Vexilla.Client
{
    public class GroupConverter
    {
        public static Group Deserialize(string jsonString)
        {
            var newGroup = new Group();

            using (var document = JsonDocument.Parse(jsonString))
            {
                var root = document.RootElement;
                newGroup.Name = root.GetProperty("name").GetString();
                newGroup.GroupId = root.GetProperty("groupId").GetString();
                newGroup.Meta = new GroupMeta
                {
                    Version = root.GetProperty("meta").GetProperty("version")
                        .GetString()
                };

                newGroup.Features = new Dictionary<string, Feature>();

                foreach (var groupFeature in root.GetProperty("features")
                             .EnumerateObject())
                {
                    newGroup.Features.Add(groupFeature.Name,
                        _deserializeFeature(groupFeature.Value));
                }

                newGroup.Environments = new Dictionary<string, Environment>();

                foreach (var rawEnvironment in root.GetProperty("environments")
                             .EnumerateObject())
                {
                    var environment = new Environment
                    {
                        Name = rawEnvironment.Value.GetProperty("name")
                            .GetString(),
                        EnvironmentId = rawEnvironment.Value
                            .GetProperty("environmentId")
                            .GetString(),
                        RawFeatures = new Dictionary<string, Feature>(),
                        ToggleFeatures =
                            new Dictionary<string, ToggleFeature>(),
                        GradualFeatures =
                            new Dictionary<string, GradualFeature>(),
                        SelectiveFeatures =
                            new Dictionary<string, SelectiveFeature>(),
                        SelectiveStringFeatures =
                            new Dictionary<string, SelectiveStringFeature>(),
                        SelectiveIntFeatures =
                            new Dictionary<string, SelectiveIntFeature>(),
                        SelectiveFloatFeatures =
                            new Dictionary<string, SelectiveFloatFeature>(),
                        ValueFeatures = new Dictionary<string, ValueFeature>(),
                        ValueStringFeatures =
                            new Dictionary<string, ValueStringFeature>(),
                        ValueIntFeatures =
                            new Dictionary<string, ValueIntFeature>(),
                        ValueFloatFeatures =
                            new Dictionary<string, ValueFloatFeature>()
                    };

                    foreach (var rawFeature in rawEnvironment.Value
                                 .GetProperty("features")
                                 .EnumerateObject())
                    {
                        var feature = _deserializeFeature(rawFeature.Value);
                        environment.RawFeatures.Add(rawFeature.Name, feature);

                        switch (feature.FeatureType)
                        {
                            case FeatureType.Toggle:
                                environment.ToggleFeatures.Add(
                                    feature.FeatureId,
                                    _deserializeToggleFeature(rawFeature
                                        .Value));
                                break;
                            case FeatureType.Gradual:
                                environment.GradualFeatures.Add(
                                    feature.FeatureId,
                                    _deserializeGradualFeature(rawFeature
                                        .Value));
                                break;
                            case FeatureType.Selective:
                                var selectiveFeature =
                                    _deserializeSelectiveFeature(rawFeature
                                        .Value);
                                environment.SelectiveFeatures.Add(
                                    feature.FeatureId, selectiveFeature);

                                switch (selectiveFeature.ValueType)
                                {
                                    case ValueType.StringValueType:
                                        environment.SelectiveStringFeatures.Add(
                                            rawFeature.Name,
                                            _deserializeSelectiveStringFeature(
                                                rawFeature.Value));
                                        break;
                                    case ValueType.IntValueType:
                                        environment.SelectiveIntFeatures.Add(
                                            rawFeature.Name,
                                            _deserializeSelectiveIntFeature(
                                                rawFeature.Value));
                                        break;
                                    case ValueType.FloatValueType:
                                        environment.SelectiveFloatFeatures.Add(
                                            rawFeature.Name,
                                            _deserializeSelectiveFloatFeature(
                                                rawFeature.Value));
                                        break;
                                }

                                break;
                            case FeatureType.Value:
                                var valueFeature =
                                    _deserializeValueFeature(rawFeature.Value);
                                environment.ValueFeatures.Add(feature.FeatureId,
                                    valueFeature);

                                switch (valueFeature.ValueType)
                                {
                                    case ValueType.StringValueType:
                                        environment.ValueStringFeatures.Add(
                                            rawFeature.Name,
                                            _deserializeValueStringFeature(
                                                rawFeature.Value));
                                        break;
                                    case ValueType.IntValueType:
                                        environment.ValueIntFeatures.Add(
                                            rawFeature.Name,
                                            _deserializeValueIntFeature(
                                                rawFeature.Value));
                                        break;
                                    case ValueType.FloatValueType:
                                        environment.ValueFloatFeatures.Add(
                                            rawFeature.Name,
                                            _deserializeValueFloatFeature(
                                                rawFeature.Value));
                                        break;
                                }

                                break;
                        }
                    }


                    newGroup.Environments.Add(rawEnvironment.Name, environment);
                }
            }

            return newGroup;
        }

        private static Feature _deserializeFeature(JsonElement jsonElement)
        {
            var feature = new Feature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule"))
            };


            return feature;
        }

        private static ToggleFeature _deserializeToggleFeature(
            JsonElement jsonElement)
        {
            var feature = new ToggleFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                Value = jsonElement.GetProperty("value").GetBoolean()
            };

            return feature;
        }

        private static GradualFeature _deserializeGradualFeature(
            JsonElement jsonElement)
        {
            var raw = jsonElement.ToString();

            var feature = new GradualFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                Value = jsonElement.GetProperty("value").GetDouble(),
                Seed = jsonElement.GetProperty("seed").GetDouble()
            };
            return feature;
        }

        private static SelectiveFeature _deserializeSelectiveFeature(
            JsonElement jsonElement)
        {
            var feature = new SelectiveFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString()
            };
            return feature;
        }


        private static SelectiveStringFeature
            _deserializeSelectiveStringFeature(
                JsonElement jsonElement)
        {
            var feature = new SelectiveStringFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString(),
                Value = jsonElement.GetProperty("value").EnumerateArray()
                    .Cast<string>().ToArray()
            };

            return feature;
        }

        private static SelectiveIntFeature _deserializeSelectiveIntFeature(
            JsonElement jsonElement)
        {
            var feature = new SelectiveIntFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString(),
                Value = jsonElement.GetProperty("value").EnumerateArray()
                    .Cast<long>().ToArray()
            };

            return feature;
        }

        private static SelectiveFloatFeature _deserializeSelectiveFloatFeature(
            JsonElement jsonElement)
        {
            var feature = new SelectiveFloatFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString(),
                Value = jsonElement.GetProperty("value").EnumerateArray()
                    .Cast<double>().ToArray()
            };
            return feature;
        }

        private static ValueFeature _deserializeValueFeature(
            JsonElement jsonElement)
        {
            var feature = new ValueFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString()
            };
            return feature;
        }


        private static ValueStringFeature _deserializeValueStringFeature(
            JsonElement jsonElement)
        {
            var feature = new ValueStringFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString(),
                Value = jsonElement.GetProperty("value").GetString()
            };
            return feature;
        }

        private static ValueIntFeature _deserializeValueIntFeature(
            JsonElement jsonElement)
        {
            var feature = new ValueIntFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString(),
                Value = jsonElement.GetProperty("value").GetInt64()
            };
            return feature;
        }

        private static ValueFloatFeature _deserializeValueFloatFeature(
            JsonElement jsonElement)
        {
            var feature = new ValueFloatFeature
            {
                Name = jsonElement.GetProperty("name").GetString(),
                FeatureId = jsonElement.GetProperty("featureId").GetString(),
                FeatureType =
                    jsonElement.GetProperty("featureType").GetString(),
                ScheduleType =
                    jsonElement.GetProperty("scheduleType").GetString(),
                Schedule =
                    _deserializeSchedule(jsonElement.GetProperty("schedule")),
                ValueType = jsonElement.GetProperty("valueType").GetString(),
                Value = jsonElement.GetProperty("value").GetDouble()
            };
            return feature;
        }

        private static Schedule _deserializeSchedule(JsonElement jsonElement)
        {
            var schedule = new Schedule
            {
                Start = jsonElement.GetProperty("start").GetInt64(),
                End = jsonElement.GetProperty("end").GetInt64(),
                StartTime = jsonElement.GetProperty("startTime").GetInt64(),
                EndTime = jsonElement.GetProperty("endTime").GetInt64(),
                Timezone = jsonElement.GetProperty("timezone").GetString(),
                TimeType = jsonElement.GetProperty("timeType").GetString()
            };

            return schedule;
        }
    }
}