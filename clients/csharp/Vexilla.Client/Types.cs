using System.Collections.Generic;

namespace Vexilla.Client
{
    public static class FeatureType
    {
        public const string Toggle = "toggle";
        public const string Gradual = "gradual";
        public const string Selective = "selective";
        public const string Value = "value";
    }

    public static class ScheduleType
    {
        public const string Empty = "";
        public const string Global = "global";
        public const string Environment = "environment";
    }

    public static class ScheduleTimeType
    {
        public const string None = "none";
        public const string StartEnd = "start/end";
        public const string Daily = "daily";
    }

    public static class ValueType
    {
        public const string StringValueType = "string";
        public const string IntValueType = "int";
        public const string FloatValueType = "double";
    }

    public class Schedule
    {
        public long End;
        public long EndTime;
        public long Start;
        public long StartTime;
        public string TimeType;
        public string Timezone;
    }

    public class GroupMeta
    {
        public string Version;
    }

    public class Feature
    {
        public string FeatureId;
        public string FeatureType;
        public string Name;
        public Schedule Schedule;
        public string ScheduleType;
    }


    public class ToggleFeature : Feature
    {
        public bool Value;
    }

    public class GradualFeature : Feature
    {
        public double Seed;
        public double Value;
    }

    public class ValueFeature : Feature
    {
        public string ValueType;
    }


    public class ValueStringFeature : ValueFeature
    {
        public string Value;
    }

    public class ValueIntFeature : ValueFeature
    {
        public long Value;
    }

    public class ValueFloatFeature : ValueFeature
    {
        public double Value;
    }

    public class SelectiveFeature : Feature
    {
        public string ValueType;
    }

    public class SelectiveStringFeature : SelectiveFeature
    {
        public string[] Value;
    }

    public class SelectiveIntFeature : SelectiveFeature
    {
        public long[] Value;
    }

    public class SelectiveFloatFeature : SelectiveFeature
    {
        public double[] Value;
    }


    public class BaseEnvironment
    {
        public string EnvironmentId;
        public string Name;
        public Dictionary<string, Feature> RawFeatures;
    }

    public class Environment : BaseEnvironment
    {
        public Dictionary<string, GradualFeature> GradualFeatures;

        public Dictionary<string, SelectiveFeature> SelectiveFeatures;
        public Dictionary<string, SelectiveFloatFeature> SelectiveFloatFeatures;
        public Dictionary<string, SelectiveIntFeature> SelectiveIntFeatures;

        public Dictionary<string, SelectiveStringFeature>
            SelectiveStringFeatures;

        public Dictionary<string, ToggleFeature> ToggleFeatures;

        public Dictionary<string, ValueFeature> ValueFeatures;
        public Dictionary<string, ValueFloatFeature> ValueFloatFeatures;
        public Dictionary<string, ValueIntFeature> ValueIntFeatures;
        public Dictionary<string, ValueStringFeature> ValueStringFeatures;
    }

    public class ManifestGroup
    {
        public string GroupId;
        public string Name;
    }

    public class Manifest
    {
        public ManifestGroup[] Groups;
        public string Version;
    }

    public class Group
    {
        public Dictionary<string, Environment> Environments;
        public Dictionary<string, Feature> Features;
        public string GroupId;
        public GroupMeta Meta;
        public string Name;
    }

    public class RealIds
    {
        public string RealEnvironmentId;
        public string RealFeatureId;
        public string RealGroupId;
    }
}