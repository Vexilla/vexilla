using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace Vexilla.Client
{
    public class VexillaClientBase
    {
        private readonly string _baseUrl;
        private readonly object _instanceId;
        private readonly string _environment;
        private readonly bool _showLogs;
        private Manifest _manifest;
        private Dictionary<string, string> _groupAliases = new Dictionary<string, string>();
        private readonly Dictionary<string, Group> _groups = new Dictionary<string, Group>();
        private readonly Dictionary<string, Dictionary<string, string>> _environmentAliases = new Dictionary<string, Dictionary<string, string>>();
        private readonly Dictionary<string, Dictionary<string, string>> _featureAliases = new Dictionary<string, Dictionary<string, string>>();

        public VexillaClientBase(string baseUrl, string environment, object instanceId, bool showLogs = false)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _environment = environment;
            _instanceId = instanceId;
            _showLogs = showLogs;
        }
        public VexillaClientBase(string baseUrl, string environment, string instanceId, bool showLogs = false)
            : this(baseUrl, environment, (object)instanceId, showLogs) { }

        private void ReportOperation(string operationName, bool succeeded)
        {
            if (_showLogs)
            {
                var outcome = succeeded ? "success" : "failure";
                Console.Error.WriteLine("vexilla operation=" + operationName + " outcome=" + outcome);
            }
        }
        private T DiagnoseOperation<T>(string operationName, Func<T> operation)
        {
            try
            {
                var result = operation();
                ReportOperation(operationName, true);
                return result;
            }
            catch
            {
                ReportOperation(operationName, false);
                throw;
            }
        }
        private async Task<T> DiagnoseAsyncOperation<T>(string operationName, Func<Task<T>> operation)
        {
            try
            {
                var result = await operation();
                ReportOperation(operationName, true);
                return result;
            }
            catch
            {
                ReportOperation(operationName, false);
                throw;
            }
        }

        private async Task<string> Fetch(Func<string, Task<string>> fetch, string path)
        {
            try
            {
                return await fetch(_baseUrl + "/" + path);
            }
            catch (Exception fetchError)
            {
                throw new ContractException("fetch", "Failed to fetch " + path + ": " + fetchError.Message);
            }
        }
        public async Task<Manifest> GetManifest(Func<string, Task<string>> fetch)
        {
            return await DiagnoseAsyncOperation("manifest.fetch", async () =>
            {
                return GroupConverter.DeserializeManifest(await Fetch(fetch, "manifest.json"));
            });
        }
        public void SetManifest(Manifest manifest)
        {
            DiagnoseOperation("manifest.install", () =>
            {
                var manifestSnapshot = GroupConverter.DeserializeManifest(GroupConverter.Serialize(manifest));
                var groupAliases = new Dictionary<string, string>();
                foreach (var manifestEntry in manifestSnapshot.Groups)
                {
                    Validation.AddAlias(groupAliases, manifestEntry.GroupId, manifestEntry.Name);
                }

                foreach (var groupId in _groups.Keys.ToArray())
                {
                    if (!manifestSnapshot.Groups.Any(manifestEntry => manifestEntry.GroupId == groupId && manifestEntry.Name == _groups[groupId].Name))
                    {
                        _groups.Remove(groupId);
                        _featureAliases.Remove(groupId);
                        _environmentAliases.Remove(groupId);
                    }
                }
                _manifest = manifestSnapshot;
                _groupAliases = groupAliases;

                return true;
            });
        }
        public async Task SyncManifest(Func<string, Task<string>> fetch)
        {
            SetManifest(await GetManifest(fetch));
        }
        private string GroupId(string name)
        {
            if (!_groupAliases.TryGetValue(name, out var groupId))
            {
                throw new ContractException("lookup", "Group not found: " + name);
            }

            return groupId;
        }
        private void MatchManifest(Group group)
        {
            if (_manifest == null)
            {
                throw new ContractException("lookup", "Manifest is not installed");
            }

            Validation.Require(_manifest.Groups.Any(manifestGroup => manifestGroup.GroupId == group.GroupId && manifestGroup.Name == group.Name), "Group does not match its manifest ID/name");
        }
        public async Task<Group> GetFlags(string groupNameOrId, Func<string, Task<string>> fetch)
        {
            return await DiagnoseAsyncOperation("group.fetch", async () =>
            {
                var groupId = GroupId(groupNameOrId);
                var group = GroupConverter.Deserialize(await Fetch(fetch, groupId + ".json"));
                MatchManifest(group);
                Validation.Require(group.GroupId == groupId, "Fetched group differs from requested group");
                return group;
            });
        }
        public void SetFlags(Group group)
        {
            DiagnoseOperation("group.install", () =>
            {
                var groupSnapshot = GroupConverter.Deserialize(GroupConverter.Serialize(group));
                MatchManifest(groupSnapshot);
                var environmentAliases = new Dictionary<string, string>();
                var featureAliases = new Dictionary<string, string>();
                foreach (var environmentEntry in groupSnapshot.Environments)
                {
                    Validation.AddAlias(environmentAliases, environmentEntry.Key, environmentEntry.Value.Name);
                }

                foreach (var feature in groupSnapshot.Features)
                {
                    Validation.AddAlias(featureAliases, feature.Key, feature.Value.Name);
                }

                _groups[groupSnapshot.GroupId] = groupSnapshot;
                _environmentAliases[groupSnapshot.GroupId] = environmentAliases;
                _featureAliases[groupSnapshot.GroupId] = featureAliases;

                return true;
            });
        }
        public async Task SyncFlags(string groupNameOrId, Func<string, Task<string>> fetch)
        {
            SetFlags(await GetFlags(groupNameOrId, fetch));
        }
        private Feature Lookup(string groupNameOrId, string featureNameOrId)
        {
            var groupId = GroupId(groupNameOrId);
            if (!_groups.TryGetValue(groupId, out var installedGroup) || !_environmentAliases[groupId].TryGetValue(_environment, out var environmentId) || !_featureAliases[groupId].TryGetValue(featureNameOrId, out var featureId))
            {
                throw new ContractException("lookup", "Feature/environment is not installed");
            }

            return installedGroup.Environments[environmentId].RawFeatures[featureId];
        }
        public bool Should(string groupNameOrId, string featureNameOrId)
        {
            return ShouldCustom(groupNameOrId, featureNameOrId, _instanceId);
        }
        public bool ShouldCustomString(string groupNameOrId, string featureNameOrId, string customInstanceId)
        {
            return ShouldCustom(groupNameOrId, featureNameOrId, customInstanceId);
        }
        public bool ShouldCustomLong(string groupNameOrId, string featureNameOrId, long customInstanceId)
        {
            return ShouldCustom(groupNameOrId, featureNameOrId, customInstanceId);
        }
        public bool ShouldCustomDouble(string groupNameOrId, string featureNameOrId, double customInstanceId)
        {
            return ShouldCustom(groupNameOrId, featureNameOrId, customInstanceId);
        }
        public bool ShouldCustom(string groupNameOrId, string featureNameOrId, object instance)
        {
            var feature = Lookup(groupNameOrId, featureNameOrId);
            if (feature.FeatureType == "value")
            {
                throw new ContractException("kind", "Value feature requires a value operation");
            }

            string instanceText = null;
            if (feature.FeatureType != "toggle")
            {
                instanceText = VexillaHasher.InstanceText(instance);
            }

            if (!Scheduler.IsScheduleFeatureActive(feature))
            {
                return false;
            }

            if (feature is ToggleFeature toggle)
            {
                return toggle.Value;
            }

            if (feature is GradualFeature gradual)
            {
                return VexillaHasher.HashString(instanceText, gradual.Seed) < gradual.Value;
            }

            if (feature is SelectiveStringFeature selectiveStringFeature)
            {
                return instance is string stringInstanceId && selectiveStringFeature.Value.Contains(stringInstanceId, StringComparer.Ordinal);
            }

            if (instance is string)
            {
                return false;
            }

            var numericInstanceId = Convert.ToDouble(instance, CultureInfo.InvariantCulture);
            if (feature is SelectiveIntFeature selectiveIntegerFeature)
            {
                return selectiveIntegerFeature.Value.Any(v => v == numericInstanceId);
            }

            if (feature is SelectiveFloatFeature selectiveFloatFeature)
            {
                return selectiveFloatFeature.Value.Contains(numericInstanceId);
            }

            throw new ContractException("kind", "Unsupported boolean operation");
        }
        public object Value(string groupNameOrId, string featureNameOrId, object fallback)
        {
            var feature = Lookup(groupNameOrId, featureNameOrId);
            if (feature.FeatureType != "value")
            {
                throw new ContractException("kind", "Feature is not a value");
            }

            return Scheduler.IsScheduleFeatureActive(feature) ? ValueData(feature) : fallback;
        }
        private static object ValueData(Feature feature)
        {
            if (feature is ValueStringFeature stringFeature)
            {
                return stringFeature.Value;
            }

            if (feature is ValueIntFeature integerFeature)
            {
                return integerFeature.Value;
            }

            if (feature is ValueFloatFeature floatFeature)
            {
                return floatFeature.Value;
            }

            throw new ContractException("kind", "Unsupported value subtype");
        }
        private T TypedValue<T>(string groupNameOrId, string featureNameOrId, T fallback)
        {
            var feature = Lookup(groupNameOrId, featureNameOrId);
            var value = ValueData(feature);
            if (!(value is T))
            {
                throw new ContractException("kind", "Value subtype differs from accessor");
            }

            return Scheduler.IsScheduleFeatureActive(feature) ? (T)value : fallback;
        }
        public string ValueString(string groupNameOrId, string featureNameOrId, string defaultValue)
        {
            return TypedValue(groupNameOrId, featureNameOrId, defaultValue);
        }
        public long ValueLong(string groupNameOrId, string featureNameOrId, long defaultValue)
        {
            return TypedValue(groupNameOrId, featureNameOrId, defaultValue);
        }
        public double ValueDouble(string groupNameOrId, string featureNameOrId, double defaultValue)
        {
            return TypedValue(groupNameOrId, featureNameOrId, defaultValue);
        }
    }
}
