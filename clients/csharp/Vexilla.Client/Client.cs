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
        private Manifest _manifest;
        private Dictionary<string, string> _groupAliases = new Dictionary<string, string>();
        private readonly Dictionary<string, Group> _groups = new Dictionary<string, Group>();
        private readonly Dictionary<string, Dictionary<string, string>> _environmentAliases = new Dictionary<string, Dictionary<string, string>>();
        private readonly Dictionary<string, Dictionary<string, string>> _featureAliases = new Dictionary<string, Dictionary<string, string>>();

        public VexillaClientBase(string baseUrl, string environment, object instanceId, bool showLogs = false)
        { _baseUrl = baseUrl.TrimEnd('/'); _environment = environment; _instanceId = instanceId; }
        public VexillaClientBase(string baseUrl, string environment, string instanceId, bool showLogs = false)
            : this(baseUrl, environment, (object)instanceId, showLogs) { }

        private async Task<string> Fetch(Func<string, Task<string>> fetch, string path)
        {
            try { return await fetch(_baseUrl + "/" + path); }
            catch (Exception e) { throw new ContractException("fetch", "Failed to fetch " + path + ": " + e.Message); }
        }
        public async Task<Manifest> GetManifest(Func<string, Task<string>> fetch)
        { return GroupConverter.DeserializeManifest(await Fetch(fetch, "manifest.json")); }
        public void SetManifest(Manifest manifest)
        {
            var snapshot = GroupConverter.DeserializeManifest(GroupConverter.Serialize(manifest));
            var aliases = new Dictionary<string, string>();
            foreach (var entry in snapshot.Groups)
            {
                Validation.AddAlias(aliases, entry.GroupId, entry.Name);
            }

            foreach (var id in _groups.Keys.ToArray())
            {
                if (!snapshot.Groups.Any(e => e.GroupId == id && e.Name == _groups[id].Name))
                { _groups.Remove(id); _featureAliases.Remove(id); _environmentAliases.Remove(id); }
            }
            _manifest = snapshot; _groupAliases = aliases;
        }
        public async Task SyncManifest(Func<string, Task<string>> fetch) { SetManifest(await GetManifest(fetch)); }
        private string GroupId(string name)
        {
            if (!_groupAliases.TryGetValue(name, out var id))
            {
                throw new ContractException("lookup", "Group not found: " + name);
            }

            return id;
        }
        private void MatchManifest(Group group)
        {
            if (_manifest == null)
            {
                throw new ContractException("lookup", "Manifest is not installed");
            }

            Validation.Require(_manifest.Groups.Any(g => g.GroupId == group.GroupId && g.Name == group.Name), "Group does not match its manifest ID/name");
        }
        public async Task<Group> GetFlags(string groupNameOrId, Func<string, Task<string>> fetch)
        {
            var id = GroupId(groupNameOrId);
            var group = GroupConverter.Deserialize(await Fetch(fetch, id + ".json"));
            MatchManifest(group); Validation.Require(group.GroupId == id, "Fetched group differs from requested group");
            return group;
        }
        public void SetFlags(Group group)
        {
            var snapshot = GroupConverter.Deserialize(GroupConverter.Serialize(group)); MatchManifest(snapshot);
            var environments = new Dictionary<string, string>(); var features = new Dictionary<string, string>();
            foreach (var env in snapshot.Environments)
            {
                Validation.AddAlias(environments, env.Key, env.Value.Name);
            }

            foreach (var feature in snapshot.Features)
            {
                Validation.AddAlias(features, feature.Key, feature.Value.Name);
            }

            _groups[snapshot.GroupId] = snapshot; _environmentAliases[snapshot.GroupId] = environments; _featureAliases[snapshot.GroupId] = features;
        }
        public async Task SyncFlags(string groupNameOrId, Func<string, Task<string>> fetch) { SetFlags(await GetFlags(groupNameOrId, fetch)); }
        private Feature Lookup(string group, string feature)
        {
            var id = GroupId(group);
            if (!_groups.TryGetValue(id, out var installed) || !_environmentAliases[id].TryGetValue(_environment, out var env) || !_featureAliases[id].TryGetValue(feature, out var fid))
            {
                throw new ContractException("lookup", "Feature/environment is not installed");
            }

            return installed.Environments[env].RawFeatures[fid];
        }
        public bool Should(string groupNameOrId, string featureNameOrId) { return ShouldCustom(groupNameOrId, featureNameOrId, _instanceId); }
        public bool ShouldCustomString(string groupNameOrId, string featureNameOrId, string customInstanceId) { return ShouldCustom(groupNameOrId, featureNameOrId, customInstanceId); }
        public bool ShouldCustomLong(string groupNameOrId, string featureNameOrId, long customInstanceId) { return ShouldCustom(groupNameOrId, featureNameOrId, customInstanceId); }
        public bool ShouldCustomDouble(string groupNameOrId, string featureNameOrId, double customInstanceId) { return ShouldCustom(groupNameOrId, featureNameOrId, customInstanceId); }
        public bool ShouldCustom(string group, string feature, object instance)
        {
            var f = Lookup(group, feature);
            if (f.FeatureType == "value")
            {
                throw new ContractException("kind", "Value feature requires a value operation");
            }

            string text = null;
            if (f.FeatureType != "toggle")
            {
                text = VexillaHasher.InstanceText(instance);
            }

            if (!Scheduler.IsScheduleFeatureActive(f))
            {
                return false;
            }

            if (f is ToggleFeature toggle)
            {
                return toggle.Value;
            }

            if (f is GradualFeature gradual)
            {
                return VexillaHasher.HashString(text, gradual.Seed) < gradual.Value;
            }

            if (f is SelectiveStringFeature strings)
            {
                return instance is string s && strings.Value.Contains(s, StringComparer.Ordinal);
            }

            if (instance is string)
            {
                return false;
            }

            var number = Convert.ToDouble(instance, CultureInfo.InvariantCulture);
            if (f is SelectiveIntFeature integers)
            {
                return integers.Value.Any(v => v == number);
            }

            if (f is SelectiveFloatFeature floats)
            {
                return floats.Value.Contains(number);
            }

            throw new ContractException("kind", "Unsupported boolean operation");
        }
        public object Value(string group, string feature, object fallback)
        {
            var f = Lookup(group, feature);
            if (f.FeatureType != "value")
            {
                throw new ContractException("kind", "Feature is not a value");
            }

            return Scheduler.IsScheduleFeatureActive(f) ? ValueData(f) : fallback;
        }
        private static object ValueData(Feature f)
        {
            if (f is ValueStringFeature s)
            {
                return s.Value;
            }

            if (f is ValueIntFeature i)
            {
                return i.Value;
            }

            if (f is ValueFloatFeature d)
            {
                return d.Value;
            }

            throw new ContractException("kind", "Unsupported value subtype");
        }
        private T TypedValue<T>(string group, string feature, T fallback)
        {
            var f = Lookup(group, feature); var value = ValueData(f);
            if (!(value is T))
            {
                throw new ContractException("kind", "Value subtype differs from accessor");
            }

            return Scheduler.IsScheduleFeatureActive(f) ? (T)value : fallback;
        }
        public string ValueString(string groupNameOrId, string featureNameOrId, string defaultValue) { return TypedValue(groupNameOrId, featureNameOrId, defaultValue); }
        public long ValueLong(string groupNameOrId, string featureNameOrId, long defaultValue) { return TypedValue(groupNameOrId, featureNameOrId, defaultValue); }
        public double ValueDouble(string groupNameOrId, string featureNameOrId, double defaultValue) { return TypedValue(groupNameOrId, featureNameOrId, defaultValue); }
    }
}
