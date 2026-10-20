using System.Text.Json;
using System.Text.Json.Nodes;
using Vexilla.Client;

var dir = System.Environment.GetEnvironmentVariable("VEXILLA_CONTRACT_DIR") ?? throw new Exception("Generate contract artifacts first");
Task<string> Fetch(string url) => File.ReadAllTextAsync(Path.Combine(dir, new Uri(url).Segments.Last()));
using var expectations = JsonDocument.Parse(File.ReadAllText(Path.Combine(dir, "expected.json")));
var expected = expectations.RootElement;
void Check(bool ok, string field) {
  if (!ok) {
    throw new Exception("Contract mismatch: " + field);
  }
}
foreach (var sample in expected.GetProperty("seedCases").EnumerateArray()) {
  var group = JsonNode.Parse(File.ReadAllText(Path.Combine(dir, "contract-group.json")));
  group["environments"]["dev"]["features"]["gradual"]["seed"] = JsonNode.Parse(sample.GetProperty("value").GetRawText());
  var accepted = true;
  try {
    GroupConverter.Deserialize(group.ToJsonString());
  } catch (Exception) {
    accepted = false;
  }
  Check(accepted == sample.GetProperty("valid").GetBoolean(), "seed " + sample.GetProperty("value"));
}
foreach (var env in expected.GetProperty("environments").EnumerateArray()) {
  foreach (var names in new [] {false, true}) {
    var client = new VexillaClientBase("https://contract", env.GetProperty(names ? "name" : "id").GetString(), "member");
    await client.SyncManifest(Fetch);
    var group = expected.GetProperty(names ? "groupName" : "groupId").GetString();
    var decoded = await client.GetFlags(group, Fetch);
    var gradual = decoded.Environments[env.GetProperty("id").GetString()].GradualFeatures["gradual"];
    Check(gradual.Seed == env.GetProperty("seed").GetDouble(), "seed");
    Check(gradual.Value == env.GetProperty("threshold").GetDouble(), "threshold");
    foreach (var fid in expected.GetProperty("scheduled").EnumerateArray().Select(f => f.GetString()).Append("scheduled-active")) {
      var f = decoded.Environments[env.GetProperty("id").GetString()].ToggleFeatures[fid];
      Check(Scheduler.IsScheduleActiveWithNow(f.Schedule,f.ScheduleType,DateTimeOffset.FromUnixTimeMilliseconds(expected.GetProperty("referenceClock").GetInt64())) == (fid == "scheduled-active"),"reference clock: " + fid);
    }
    client.SetFlags(decoded);
    foreach (var c in expected.GetProperty("cases").EnumerateArray()) {
      var f = c.GetProperty(names ? "name" : "id").GetString();
      var key = c.GetProperty("expectedKey").GetString();
      var want = env.GetProperty(key);
      if (c.GetProperty("kind").GetString() == "value") {
        switch (key) {
          case "string": Check(client.ValueString(group,f,"fallback") == want.GetString(),f); break;
          case "int": Check(client.ValueLong(group,f,-1) == want.GetInt64(),f); break;
          default: Check(client.ValueDouble(group,f,-1) == want.GetDouble(),f); break;
        }
      } else {
        var instance = c.GetProperty("instance");
        var result = instance.ValueKind == JsonValueKind.String ? client.ShouldCustomString(group,f,instance.GetString())
          : c.GetProperty("id").GetString() == "selective-int" ? client.ShouldCustomLong(group,f,instance.GetInt64()) : client.ShouldCustomDouble(group,f,instance.GetDouble());
        Check(result == want.GetBoolean(),f);
      }
    }
    foreach (var f in expected.GetProperty("scheduled").EnumerateArray()) {
      Check(!client.Should(group,f.GetString()),f.GetString());
    }
  }
}
Console.WriteLine("Shared C# contract passed");
