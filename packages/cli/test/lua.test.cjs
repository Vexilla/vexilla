const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { transformConstants } = require("../bin/transform.js");
const { luaString } = require("../bin/lua.js");
const root = path.resolve(__dirname, "../../..");
const dir = path.resolve(
  process.env.VEXILLA_CONTRACT_DIR || path.join(root, ".contract-artifacts")
);
const group = JSON.parse(
  fs.readFileSync(path.join(dir, "contract-group.json"))
);

test("existing language output remains byte-for-byte identical", () => {
  for (const [language, hash] of Object.entries(
    require("./existing-output-hashes.json")
  )) {
    assert.equal(
      createHash("sha256")
        .update(transformConstants(language, [group], "Before", "After"))
        .digest("hex"),
      hash,
      language
    );
  }
});
test("Lua aliases, constants, escaping and real SDK evaluation work on every supported runtime", () => {
  const tools = JSON.parse(
    fs.readFileSync(
      path.join(
        process.env.VEXILLA_LUA_TOOLCHAIN ||
          path.join(root, ".contract-toolchains/lua"),
        "tools.json"
      )
    )
  );
  for (const runtime of require("../../../contract/lua-toolchain.json")
    .runtimes) {
    assert.ok(tools.some((tool) => tool.id === runtime.id));
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-cli-lua-"));
  try {
    const constants = transformConstants("LUA", [group], "Before", "After");
    fs.writeFileSync(path.join(scratch, "constants.lua"), constants);
    const special = structuredClone(group);
    special.name = '9 end " quote \\ slash\n\0line ]=]';
    special.groupId = 'group"\\\n\0';
    const names = [
      "end",
      "local",
      "return",
      "and",
      "9 lives",
      "",
      "a+b",
      "a b",
      "漢字",
    ];
    Object.values(special.features).forEach((feature, i) => {
      feature.name = names[i % names.length];
      feature.featureId = 'f"\\\n\0' + i;
    });
    fs.writeFileSync(
      path.join(scratch, "special.lua"),
      transformConstants("lua", [special], "return", "end")
    );
    fs.writeFileSync(
      path.join(scratch, "verify.lua"),
      `
      local Client = require('vexilla_client')
      local json = require('dkjson')
      local function read(name)
        local f = assert(io.open(${luaString(dir)} .. '/' .. name, 'rb'))
        local text = f:read('*a'); f:close()
        local value, _, err = json.decode(text, 1, json.null); assert(not err, err); return value
      end
      local g = require('constants').BeforeContractAfterGroup
      assert(g.name == 'Contract' and g.id == 'contract-group')
      local c = Client.new({base_url = 'https://contract', environment = g.environments.Production, custom_instance_id = 'member'})
      local function fetch(url) return read(assert(url:match('([^/]+)$'))) end
      c:sync_manifest(fetch); c:sync_flags(g.id, fetch)
      assert(c:should(g.id, g.features.Toggle))
      assert(c:should(g.id, g.features.SelectiveInt, 42))
      assert(c:value(g.id, g.features.ValueString, 'fallback') == 'hello')
      local _, special = next((require('special')))
      assert(special.name == ${luaString(
        special.name
      )} and special.id == ${luaString(special.groupId)})
      local seen, count = {}, 0
      for key, value in pairs(special.features) do
        assert(key:match('^[A-Za-z_][A-Za-z0-9_]*$'))
        assert(not seen[value]); seen[value] = true; count = count + 1
      end
      assert(count == ${Object.keys(special.features).length})
      print('CLI Lua constants and SDK evaluation passed')
    `
    );
    for (const tool of tools) {
      execFileSync(tool.lua, [path.join(scratch, "verify.lua")], {
        env: {
          ...process.env,
          ...tool.env,
          LUA_PATH:
            path.join(scratch, "?.lua") +
            ";" +
            path.join(root, "clients/lua/?.lua") +
            ";" +
            tool.env.LUA_PATH,
        },
        stdio: "inherit",
      });
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
