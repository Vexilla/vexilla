#nullable enable
using System.Text.Json;
using System.Text.Json.Nodes;
using Vexilla.Client;

var dir = System.Environment.GetEnvironmentVariable("VEXILLA_CONTRACT_DIR") ?? throw new Exception("Use contract/scripts/run.cjs");
JsonNode Read(string file) => JsonNode.Parse(File.ReadAllText(Path.Combine(dir, file)))!;
var parity = Read("parity.json"); var expected = Read("expected.json");
Task<string> Fetch(string url) => File.ReadAllTextAsync(Path.Combine(dir, new Uri(url).Segments.Last()));
object? Instance(JsonNode? value) => value == null ? null : value.GetValueKind() switch
{
    JsonValueKind.String => (object)value.GetValue<string>(),
    JsonValueKind.Number => (object)value.GetValue<double>(),
    JsonValueKind.True => (object)true,
    JsonValueKind.False => (object)false,
    _ => value
};
VexillaClientBase Client(string environment = "prod", object? instance = null) => new("https://contract", environment, instance);
async Task<VexillaClientBase> Installed(string environment = "prod") { var c = Client(environment, "member"); await c.SyncManifest(Fetch); await c.SyncFlags("contract-group", Fetch); return c; }
bool Equal(JsonNode? a, JsonNode? b)
{
    if (a == null || b == null)
    {
        return a == null && b == null;
    }

    if (a.GetValueKind() == JsonValueKind.Number && b.GetValueKind() == JsonValueKind.Number)
    {
        return a.GetValue<double>() == b.GetValue<double>();
    }

    if (a is JsonArray aa && b is JsonArray ba)
    {
        return aa.Count == ba.Count && aa.Zip(ba).All(p => Equal(p.First, p.Second));
    }

    if (a is JsonObject ao && b is JsonObject bo)
    {
        return ao.Count == bo.Count && ao.All(p => bo.ContainsKey(p.Key) && Equal(p.Value, bo[p.Key]));
    }

    return a.ToJsonString() == b.ToJsonString();
}
async Task<JsonNode> Outcome(Func<Task<object?>> fn)
{
    try { return new JsonObject { ["value"] = JsonSerializer.SerializeToNode(await fn()) }; }
    catch (ContractException e) { return new JsonObject { ["error"] = e.Kind }; }
    catch (JsonException) { return new JsonObject { ["error"] = "validation" }; } // Native JSON constructor rejects an unrepresentable value.
}
Task<JsonNode> SyncOutcome(Func<object?> fn) => Outcome(() => Task.FromResult(fn()));
void Mutate(JsonNode value, JsonArray mutations)
{
    string[] Keys(string pointer) => pointer[1..].Split('/').Select(k => k.Replace("~1", "/").Replace("~0", "~")).ToArray();
    JsonNode? At(string pointer) { JsonNode? n = value; foreach (var k in Keys(pointer)) { n = n is JsonArray a ? a[int.Parse(k)] : n![k]; } return n; }
    foreach (var m in mutations)
    {
        var keys = Keys(m!["path"]!.GetValue<string>()); var parent = value;
        foreach (var key in keys[..^1])
        {
            parent = (parent is JsonArray a ? a[int.Parse(key)] : parent[key])!;
        }

        var last = keys[^1]; var op = m["op"]!.GetValue<string>(); JsonNode? item;
        if (op == "remove")
        {
            if (parent is JsonArray array)
            {
                array.RemoveAt(int.Parse(last));
            }
            else
            {
                parent.AsObject().Remove(last);
            }
            continue;
        }
        if (op == "copy")
        {
            item = At(m["from"]!.GetValue<string>())?.DeepClone();
        }
        else if (m["wireString"] != null)
        {
            try { item = JsonValue.Create(JsonSerializer.Deserialize<string>(m["wireString"]!.GetValue<string>())); }
            catch (InvalidOperationException e) { throw new ContractException("validation", "Native JSON string cannot be constructed: " + e.Message); }
        }
        else if (m["nativeNumber"] != null)
        {
            item = JsonNode.Parse(m["nativeNumber"]!.GetValue<string>());
        }
        else
        {
            item = m["value"]?.DeepClone();
        }

        if (parent is JsonArray arr)
        {
            var index = int.Parse(last); if (index == arr.Count)
            {
                arr.Add(item);
            }
            else
            {
                arr[index] = item;
            }
        }
        else
        {
            parent[last] = item;
        }
    }
}
var observations = new List<JsonObject>();
void Observe(string id, JsonNode actual, JsonNode want)
{
    if (!Equal(actual, want))
    {
        throw new Exception(id + ": " + actual.ToJsonString() + " != " + want.ToJsonString());
    }

    observations.Add(new JsonObject { ["caseId"] = id, ["outcome"] = actual.DeepClone() });
}
foreach (var section in new[] { "hashes", "numbers", "gradual", "schedules", "validation", "operations", "aliases", "timezones" })
{
    foreach (var sample in parity[section]!.AsArray())
    {
        var s = sample!; var id = s["id"]!.GetValue<string>(); JsonNode actual;
        switch (section)
        {
            case "hashes":
                actual = await SyncOutcome(() => VexillaHasher.HashFnv32a(s["text"]!.GetValue<string>())); break;
            case "numbers":
                actual = await SyncOutcome(() => { var text = VexillaHasher.InstanceText(Instance(s["instance"])); return new { text, hash = VexillaHasher.HashFnv32a(text) }; }); break;
            case "gradual":
                actual = await Outcome(async () =>
                {
                    var c = Client("prod", "member"); await c.SyncManifest(Fetch);
                    var g = Read("contract-group.json");
                    g["environments"]!["prod"]!["features"]!["gradual"]!["seed"] = s["seed"]!.DeepClone();
                    g["environments"]!["prod"]!["features"]!["gradual"]!["value"] = s["threshold"]!.DeepClone();
                    c.SetFlags(GroupConverter.Deserialize(g.ToJsonString()));
                    var text = VexillaHasher.InstanceText(Instance(s["instance"]));
                    return new { bucket = VexillaHasher.HashString(text, s["seed"]!.GetValue<double>()), enabled = c.ShouldCustom("contract-group", "gradual", Instance(s["instance"])) };
                }); break;
            case "schedules":
                actual = await SyncOutcome(() => Scheduler.IsScheduleActiveMillis(GroupConverter.ReadSchedule(Validation.Parse(s["schedule"]!.ToJsonString(), Validation.Schedule)), s["scheduleType"]!.GetValue<string>(), s["now"]!.GetValue<long>())); break;
            case "validation":
                async Task<object?> Validate(bool fetched)
                {
                    var source = new JsonObject { ["manifest"] = Read("manifest.json"), ["groups"] = new JsonObject { ["contract-group"] = Read("contract-group.json") } };
                    Mutate(source, s["mutations"]!.AsArray()); var c = Client("prod", "member");
                    if (fetched)
                    {
                        await c.SyncManifest(_ => Task.FromResult(source["manifest"]!.ToJsonString()));
                    }
                    else
                    {
                        c.SetManifest(GroupConverter.DeserializeManifest(source["manifest"]!.ToJsonString()));
                    }

                    foreach (var entry in source["groups"]!.AsObject())
                    {
                        if (fetched)
                        {
                            await c.SyncFlags(entry.Key, _ => Task.FromResult(entry.Value!.ToJsonString()));
                        }
                        else
                        {
                            c.SetFlags(GroupConverter.Deserialize(entry.Value!.ToJsonString()));
                        }
                    }
                    return true;
                }
                var direct = await Outcome(() => Validate(false)); var fetched = await Outcome(() => Validate(true));
                if (!Equal(direct, fetched))
                {
                    throw new Exception("Direct/fetched disagreement: " + id);
                }

                actual = direct; break;
            case "operations":
                var clients = new Dictionary<string, VexillaClientBase>(); var data = new Dictionary<string, object>(); var results = new JsonArray();
                foreach (var raw in s["steps"]!.AsArray())
                {
                    var step = raw!; results.Add(await Outcome(async () =>
                    {
                        string Str(string key) => step[key]!.GetValue<string>();
                        var op = Str("op");
                        if (op == "load") { data[Str("as")] = Read(Str("file")); return null; }
                        if (op == "new") { clients[Str("client")] = Client(Str("environment"), Instance(step["instance"])); return null; }
                        if (op == "mutate") { Mutate((JsonNode)data[Str("data")], step["mutations"]!.AsArray()); return null; }
                        var c = clients[Str("client")];
                        Task<string> Callback(string _)
                        {
                            if (step["callback"]!["throws"]?.GetValue<bool>() == true)
                            {
                                throw new IOException("Deliberate fetch failure");
                            }

                            var callback = step["callback"]!;
                            var obj = callback["file"] != null ? Read(callback["file"]!.GetValue<string>()) : data[callback["data"]!.GetValue<string>()];
                            return Task.FromResult(obj is Manifest m ? GroupConverter.Serialize(m) : obj is Group g ? GroupConverter.Serialize(g) : ((JsonNode)obj).ToJsonString());
                        }
                        switch (op)
                        {
                            case "setManifest": c.SetManifest(data[Str("data")] is Manifest m ? m : GroupConverter.DeserializeManifest(((JsonNode)data[Str("data")]).ToJsonString())); break;
                            case "setFlags": c.SetFlags(data[Str("data")] is Group g ? g : GroupConverter.Deserialize(((JsonNode)data[Str("data")]).ToJsonString())); break;
                            case "getManifest": data[Str("as")] = await c.GetManifest(Callback); break;
                            case "getFlags": data[Str("as")] = await c.GetFlags(Str("group"), Callback); break;
                            case "syncManifest": await c.SyncManifest(Callback); break;
                            case "syncFlags": await c.SyncFlags(Str("group"), Callback); break;
                            case "should": return step["instance"] == null ? c.Should(Str("group"), Str("feature")) : c.ShouldCustom(Str("group"), Str("feature"), Instance(step["instance"]));
                            case "value": return c.Value(Str("group"), Str("feature"), Instance(step["default"]));
                            default: throw new Exception("Unknown operation: " + op);
                        }
                        return null;
                    }));
                }
                actual = new JsonObject { ["value"] = results }; break;
            case "aliases": actual = await SyncOutcome(() => Compatibility.Normalize(s["name"]!.GetValue<string>())); break;
            default:
                var zoneClient = Client("prod", "member"); await zoneClient.SyncManifest(Fetch);
                var group = Read("contract-group.json"); group["features"]!["toggle"]!["schedule"]!["timezone"] = s["timezone"]!.DeepClone();
                var result = await SyncOutcome(() => { zoneClient.SetFlags(GroupConverter.Deserialize(group.ToJsonString())); return true; });
                if (result["error"] != null && result["error"]!.GetValue<string>() != "validation")
                {
                    throw new Exception("Unexpected timezone error");
                }

                actual = new JsonObject { ["value"] = result["error"] == null }; break;
        }
        Observe(id, actual, s["expected"]!);
    }
}
foreach (var env in expected["environments"]!.AsArray())
{
    foreach (var mode in new[] { "id", "name", "alias" })
    {
        string Key(string id, string name) => mode == "id" ? id : mode == "name" ? name : Compatibility.Normalize(name);
        var environment = Key(env!["id"]!.GetValue<string>(), env["name"]!.GetValue<string>());
        var c = await Installed(environment); var group = Key(expected["groupId"]!.GetValue<string>(), expected["groupName"]!.GetValue<string>());
        var index = 0;
        foreach (var sample in expected["cases"]!.AsArray())
        {
            var s = sample!; var feature = Key(s["id"]!.GetValue<string>(), s["name"]!.GetValue<string>());
            var actual = await SyncOutcome(() => s["kind"]!.GetValue<string>() == "value" ? c.Value(group, feature, "fallback") : c.ShouldCustom(group, feature, Instance(s["instance"])));
            Observe("publication/" + env["id"]!.GetValue<string>() + "/" + mode + "/" + index++, actual, new JsonObject { ["value"] = env[s["expectedKey"]!.GetValue<string>()]!.DeepClone() });
        }
        var decoded = GroupConverter.Deserialize(Read("contract-group.json").ToJsonString());
        foreach (var name in expected["scheduled"]!.AsArray().Select(n => n!.GetValue<string>()).Append("scheduled-active"))
        {
            var f = decoded.Environments[env["id"]!.GetValue<string>()].RawFeatures[name];
            Observe("publication/" + env["id"]!.GetValue<string>() + "/" + mode + "/schedule/" + name, new JsonObject { ["value"] = Scheduler.IsScheduleActiveMillis(f.Schedule, f.ScheduleType, expected["referenceClock"]!.GetValue<long>()) }, new JsonObject { ["value"] = name == "scheduled-active" });
        }
    }
}
// Native representable malformed values must also fail at public setters.
var native = await Installed(); var changed = GroupConverter.Deserialize(Read("contract-group.json").ToJsonString());
foreach (var bad in new[] { "\\ud800", "\\udfff", "\\ud800x", "\\udc00\\ud800" })
{
    var bytes = "{\"version\":\"v1\",\"groups\":[],\"extra\":\"" + bad + "\"}";
    if ((await Outcome(async () => await native.GetManifest(_ => Task.FromResult(bytes))))["error"]?.GetValue<string>() != "validation")
    {
        throw new Exception("Raw Unicode was repaired before validation");
    }
}
native.SetFlags(changed); ((ToggleFeature)changed.Environments["prod"].RawFeatures["toggle"]).Value = false;
if (!native.Should("contract-group", "toggle"))
{
    throw new Exception("Caller mutation changed snapshot");
} ((GradualFeature)changed.Environments["prod"].RawFeatures["gradual"]).Seed = double.NaN;
var rejected = await SyncOutcome(() => { native.SetFlags(changed); return null; });
if (rejected["error"]?.GetValue<string>() != "validation" || !native.Should("contract-group", "toggle"))
{
    throw new Exception("Nonfinite native update was not atomic");
}

foreach (var instance in new object?[] { null, true, double.NaN, double.PositiveInfinity, long.MaxValue, 9007199254740993L, "\ud800", "\udfff" })
{
    if ((await SyncOutcome(() => native.ShouldCustom("contract-group", "gradual", instance)))["error"]?.GetValue<string>() != "instance")
    {
        throw new Exception("Invalid native ID accepted");
    }
}

if (observations.Select(o => o["caseId"]!.GetValue<string>()).Distinct().Count() != observations.Count)
{
    throw new Exception("Duplicate observations");
}

var output = System.Environment.GetEnvironmentVariable("VEXILLA_OBSERVATIONS_FILE");
if (output != null)
{
    File.WriteAllText(output, JsonSerializer.Serialize(new { protocol = 1, sdk = "csharp", runs = new[] { new { runtime = "native", observations } } }));
}

Console.WriteLine("C# shared observations: " + observations.Count + "; native snapshot and invalid-instance checks passed");
