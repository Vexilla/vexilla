using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace Vexilla.Client
{
    public class VexillaClientBase
    {
        private readonly string _baseUrl;
        private readonly string _customInstanceHash;
        private readonly string _environment;

        private readonly Dictionary<string, Dictionary<string, string>>
            _environmentLookupTable =
                new Dictionary<string, Dictionary<string, string>>();

        private readonly Dictionary<string, Dictionary<string, string>>
            _featureLookupTable =
                new Dictionary<string, Dictionary<string, string>>();

        private readonly Dictionary<string, Group> _flagGroups =
            new Dictionary<string, Group>();

        private readonly Dictionary<string, string> _groupLookupTable =
            new Dictionary<string, string>();

        private Manifest _manifest;

        private bool _showLogs;

        public VexillaClientBase(string baseUrl, string environment,
            string customInstanceHash, bool showLogs = false)
        {
            _baseUrl = baseUrl;
            _environment = environment;
            _customInstanceHash = customInstanceHash;
            _showLogs = showLogs;
        }

        public async Task<Manifest> GetManifest(
            Func<string, Task<string>> fetch)
        {
            var result = await fetch(_baseUrl + "/manifest.json");

            return JsonSerializer.Deserialize<Manifest>(result,
                new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    IncludeFields = true
                });
        }

        public void SetManifest(Manifest manifest)
        {
            _manifest = manifest;


            foreach (var group in manifest.Groups)
            {
                _groupLookupTable[group.GroupId] = group.GroupId;
                _groupLookupTable[group.Name] = group.GroupId;
            }
        }

        public async Task SyncManifest(Func<string, Task<string>> fetch)
        {
            var manifest = await GetManifest(fetch);
            SetManifest(manifest);
        }

        public async Task<Group> GetFlags(string groupNameOrId,
            Func<string, Task<string>> fetch)
        {
            var groupId = _groupLookupTable[groupNameOrId];
            var result = await fetch(_baseUrl + $"/{groupId}.json");

            return GroupConverter.Deserialize(result);
        }

        public void SetFlags(Group group)
        {
            _flagGroups[group.GroupId] = group;


            if (!_environmentLookupTable.ContainsKey(group.GroupId))
            {
                _environmentLookupTable[group.GroupId] =
                    new Dictionary<string, string>();
            }

            foreach (var environmentPair in group.Environments)
            {
                _environmentLookupTable[group.GroupId][environmentPair.Key] =
                    environmentPair.Value.EnvironmentId;
                _environmentLookupTable[group.GroupId][
                        environmentPair.Value.Name] =
                    environmentPair.Value.EnvironmentId;
            }

            if (!_featureLookupTable.ContainsKey(group.GroupId))
            {
                _featureLookupTable[group.GroupId] =
                    new Dictionary<string, string>();
            }

            foreach (var featurePair in group.Features)
            {
                _featureLookupTable[group.GroupId][featurePair.Key] =
                    featurePair.Value.FeatureId;
                _featureLookupTable[group.GroupId][featurePair.Value.Name] =
                    featurePair.Value.FeatureId;
            }
        }

        public async Task SyncFlags(string groupNameOrId,
            Func<string, Task<string>> fetch)
        {
            var flags = await GetFlags(groupNameOrId, fetch);

            Debug.WriteLine("flags", flags);

            SetFlags(flags);
        }

        public bool Should(string groupNameOrId, string featureNameOrId)
        {
            return ShouldCustomString(groupNameOrId,
                featureNameOrId, _customInstanceHash);
        }

        public bool ShouldCustomString(string groupNameOrId,
            string featureNameOrId, string customInstanceId)
        {
            var realIds = GetRealIds(groupNameOrId, featureNameOrId);

            var environment = _flagGroups[realIds.RealGroupId]
                .Environments[realIds.RealEnvironmentId];

            var rawFeature = environment
                .RawFeatures[realIds.RealFeatureId];

            switch (rawFeature.FeatureType)
            {
                case FeatureType.Toggle:
                    var toggleFeature =
                        environment.ToggleFeatures[realIds.RealFeatureId];
                    return toggleFeature.Value;
                case FeatureType.Gradual:
                    var gradualFeature =
                        environment.GradualFeatures[realIds.RealFeatureId];
                    return VexillaHasher.HashString(customInstanceId,
                        gradualFeature.Seed) < gradualFeature.Value;
                case FeatureType.Selective:
                    var selectiveFeature =
                        environment.SelectiveFeatures[realIds.RealFeatureId];
                    switch (selectiveFeature.ValueType)
                    {
                        case ValueType.StringValueType:
                            var selectiveStringFeature =
                                environment.SelectiveStringFeatures[
                                    realIds.RealFeatureId];
                            return selectiveStringFeature.Value.Contains(
                                customInstanceId);
                        case ValueType.IntValueType:
                        case ValueType.FloatValueType:
                            throw new Exception(
                                $"Selective Feature with id ({realIds.RealFeatureId}) is not 'string'.");
                    }

                    return false;
                case FeatureType.Value:
                    throw new Exception(
                        "Value Features are not supported by Should functions. Try ValueString, ValueInt, or ValueFloat");
            }

            // We should not have been able to get here but we should send false anyway.
            return false;
        }

        public bool ShouldCustomInt(string groupNameOrId,
            string featureNameOrId, long customInstanceId)
        {
            var realIds = GetRealIds(groupNameOrId, featureNameOrId);

            var environment = _flagGroups[realIds.RealGroupId]
                .Environments[realIds.RealEnvironmentId];

            var rawFeature = environment
                .RawFeatures[realIds.RealFeatureId];

            switch (rawFeature.FeatureType)
            {
                case FeatureType.Toggle:
                    var toggleFeature =
                        environment.ToggleFeatures[realIds.RealFeatureId];
                    return toggleFeature.Value;
                case FeatureType.Gradual:
                    var gradualFeature =
                        environment.GradualFeatures[realIds.RealFeatureId];
                    return VexillaHasher.HashInt(customInstanceId,
                        gradualFeature.Seed) < gradualFeature.Value;
                case FeatureType.Selective:
                    var selectiveFeature =
                        environment.SelectiveFeatures[realIds.RealFeatureId];
                    switch (selectiveFeature.ValueType)
                    {
                        case ValueType.IntValueType:
                            var selectiveIntFeature =
                                environment.SelectiveIntFeatures[
                                    realIds.RealFeatureId];
                            return selectiveIntFeature.Value.Contains(
                                customInstanceId);
                        case ValueType.StringValueType:
                        case ValueType.FloatValueType:
                            throw new Exception(
                                $"Selective Feature with id ({realIds.RealFeatureId}) is not 'int/long'.");
                    }

                    return false;
                case FeatureType.Value:
                    throw new Exception(
                        "Value Features are not supported by Should functions. Try ValueString, ValueInt, or ValueFloat");
            }

            // We should not have been able to get here but we should send false anyway.
            return false;
        }

        public bool ShouldCustomFloat(string groupNameOrId,
            string featureNameOrId, double customInstanceId)
        {
            var realIds = GetRealIds(groupNameOrId, featureNameOrId);

            var environment = _flagGroups[realIds.RealGroupId]
                .Environments[realIds.RealEnvironmentId];

            var rawFeature = environment
                .RawFeatures[realIds.RealFeatureId];

            switch (rawFeature.FeatureType)
            {
                case FeatureType.Toggle:
                    var toggleFeature =
                        environment.ToggleFeatures[realIds.RealFeatureId];
                    return toggleFeature.Value;
                case FeatureType.Gradual:
                    var gradualFeature =
                        environment.GradualFeatures[realIds.RealFeatureId];
                    return VexillaHasher.HashFloat(customInstanceId,
                        gradualFeature.Seed) < gradualFeature.Value;
                case FeatureType.Selective:
                    var selectiveFeature =
                        environment.SelectiveFeatures[realIds.RealFeatureId];
                    switch (selectiveFeature.ValueType)
                    {
                        case ValueType.FloatValueType:
                            var selectiveFloatFeature =
                                environment.SelectiveFloatFeatures[
                                    realIds.RealFeatureId];
                            return selectiveFloatFeature.Value.Contains(
                                customInstanceId);
                        case ValueType.StringValueType:
                        case ValueType.IntValueType:
                            throw new Exception(
                                $"Selective Feature with id ({realIds.RealFeatureId}) is not 'int/long'.");
                    }

                    return false;
                case FeatureType.Value:
                    throw new Exception(
                        "Value Features are not supported by Should functions. Try ValueString, ValueInt, or ValueFloat");
            }


            // We should not have been able to get here but we should send false anyway.
            return false;
        }

        public string ValueString(string groupNameOrId, string featureNameOrId)
        {
            var realIds = GetRealIds(groupNameOrId, featureNameOrId);

            var environment = _flagGroups[realIds.RealGroupId]
                .Environments[realIds.RealEnvironmentId];

            var rawFeature = environment
                .RawFeatures[realIds.RealFeatureId];

            if (rawFeature.FeatureType != FeatureType.Value)
            {
                throw new Exception(
                    $"feature ({featureNameOrId}) is not of type 'value'");
            }

            if (!environment.ValueStringFeatures.TryGetValue(
                    realIds.RealFeatureId,
                    out var valueStringFeature))
            {
                throw new Exception(
                    $"valueFeature ({featureNameOrId}) is not of value type 'string'");
            }

            return valueStringFeature.Value;
        }

        public long ValueInt(string groupNameOrId, string featureNameOrId)
        {
            var realIds = GetRealIds(groupNameOrId, featureNameOrId);

            var environment = _flagGroups[realIds.RealGroupId]
                .Environments[realIds.RealEnvironmentId];

            var rawFeature = environment
                .RawFeatures[realIds.RealFeatureId];

            if (rawFeature.FeatureType != FeatureType.Value)
            {
                throw new Exception(
                    $"feature ({featureNameOrId}) is not of type 'value'");
            }

            if (!environment.ValueIntFeatures.TryGetValue(
                    realIds.RealFeatureId,
                    out var valueIntFeature))
            {
                throw new Exception(
                    $"valueFeature ({featureNameOrId}) is not of value type 'string'");
            }

            return valueIntFeature.Value;
        }

        public double ValueFloat(string groupNameOrId, string featureNameOrId)
        {
            var realIds = GetRealIds(groupNameOrId, featureNameOrId);

            var environment = _flagGroups[realIds.RealGroupId]
                .Environments[realIds.RealEnvironmentId];

            var rawFeature = environment
                .RawFeatures[realIds.RealFeatureId];

            if (rawFeature.FeatureType != FeatureType.Value)
            {
                throw new Exception(
                    $"feature ({featureNameOrId}) is not of type 'value'");
            }

            if (!environment.ValueFloatFeatures.TryGetValue(
                    realIds.RealFeatureId,
                    out var valueFloatFeature))
            {
                throw new Exception(
                    $"valueFeature ({featureNameOrId}) is not of value type 'string'");
            }

            return valueFloatFeature.Value;
        }

        private RealIds GetRealIds(string groupNameOrId, string featureNameOrId)
        {
            if (!_groupLookupTable.TryGetValue(groupNameOrId, out var groupId))
            {
                throw new Exception(
                    $"No group found in GroupLookupTable for name or id: {groupNameOrId}");
            }

            if (!_featureLookupTable.TryGetValue(groupId,
                    out var groupFeatures))
            {
                throw new Exception(
                    $"No group found in FeatureLookupTable for id: {groupId}");
            }

            if (!groupFeatures.TryGetValue(featureNameOrId, out var featureId))
            {
                throw new Exception(
                    $"No feature found in FeatureLookupTable for name or id: {featureNameOrId}");
            }

            if (!_environmentLookupTable.TryGetValue(groupId,
                    out var groupEnvironments))
            {
                throw new Exception(
                    $"No group found in EnvironmentLookupTable for id: {groupId}");
            }

            if (!groupEnvironments.TryGetValue(_environment,
                    out var environmentId))
            {
                throw new Exception(
                    $"No environment found in EnvironmentLookupTable for name or id: {_environment}");
            }

            return new RealIds
            {
                RealGroupId = groupId,
                RealFeatureId = featureId,
                RealEnvironmentId = environmentId
            };
        }
    }
}