const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const lock = require("../../contract/lua-toolchain.json");
const {
  checkObservations,
} = require("../../contract/scripts/observations.cjs");
const { readVectors } = require("../../contract/scripts/vectors.cjs");
const root = path.resolve(__dirname, "../..");
const toolchain = path.resolve(
  process.env.VEXILLA_LUA_TOOLCHAIN ||
    path.join(root, ".contract-toolchains/lua")
);
const tools = JSON.parse(
  fs.readFileSync(path.join(toolchain, "tools.json"), "utf8")
);
if (
  tools.length !== lock.runtimes.length ||
  new Set(tools.map((tool) => tool.id)).size !== tools.length
) {
  throw Error(
    "Missing or duplicate Lua toolchains; run node contract/scripts/setup-lua.cjs"
  );
}
const dir = path.resolve(
  process.env.VEXILLA_CONTRACT_DIR || path.join(root, ".contract-artifacts")
);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-lua-native-"));
try {
  // These extra native regressions are one deterministic input set shared by
  // every Lua runtime, with ECMAScript text expectations rather than SDK output.
  const numeric = [];
  let state = 123456789n;
  const bytes = Buffer.alloc(8);
  for (let i = 0; i < 6000; i++) {
    state =
      (state * 6364136223846793005n + 1442695040888963407n) &
      ((1n << 64n) - 1n);
    bytes.writeBigUInt64LE(state);
    const value = bytes.readDoubleLE();
    if (Number.isFinite(value)) {
      numeric.push({ value, text: String(value) });
    }
  }
  for (const value of [
    1e23, 1e-7, 1e-6, 1e20, 1e21, 0.9999999999999999, 9.999999999999998,
    1.0000000000000002, 2.2250738585072014e-308, 2.225073858507201e-308,
  ]) {
    numeric.push({ value, text: String(value) });
  }
  const numericFile = path.join(scratch, "numbers.json");
  fs.writeFileSync(numericFile, JSON.stringify(numeric));
  const runs = [];
  for (const runtime of lock.runtimes) {
    const tool = tools.find((tool) => tool.id === runtime.id);
    if (!tool || tool.version !== runtime.version) {
      throw Error("Wrong or missing pinned Lua toolchain: " + runtime.id);
    }
    const nativeVersion = execFileSync(
      tool.lua,
      ["-e", "print(jit and jit.version or _VERSION)"],
      { encoding: "utf8" }
    ).trim();
    if (
      nativeVersion !==
      (runtime.commit
        ? "LuaJIT " + runtime.version
        : "Lua " + runtime.version.slice(0, 3))
    ) {
      throw Error("Wrong interpreter for " + runtime.id + ": " + nativeVersion);
    }
    const resultFile = path.join(scratch, runtime.id + ".json");
    const packageTree = path.join(scratch, runtime.id + "-package");
    // Build the actual pinned dependency and SDK into a fresh LuaRocks tree.
    // The contract below resolves modules from that installed tree.
    execFileSync(
      tool.luarocks,
      [
        "--tree=" + packageTree,
        "make",
        "rockspecs/luasocket-3.1.0-1.rockspec",
        "--deps-mode=none",
      ],
      {
        cwd: path.join(toolchain, "sources", runtime.id + "-socket"),
        encoding: "utf8",
      }
    );
    execFileSync(
      tool.luarocks,
      [
        "--tree=" + packageTree,
        "make",
        "vexilla_client-scm-1.rockspec",
        "--deps-mode=none",
      ],
      {
        cwd: __dirname,
        encoding: "utf8",
      }
    );
    const env = {
      ...process.env,
      ...tool.env,
      LUA_PATH:
        path.join(packageTree, "share/lua", tool.luaVersion, "?.lua") +
        ";" +
        tool.env.LUA_PATH,
      LUA_CPATH:
        path.join(packageTree, "lib/lua", tool.luaVersion, "?.so") +
        ";" +
        tool.env.LUA_CPATH,
      VEXILLA_CONTRACT_DIR: dir,
      VEXILLA_OBSERVATIONS_FILE: resultFile,
      VEXILLA_LUA_RUNTIME: runtime.id,
      VEXILLA_NUMERIC_CHECKS: numericFile,
    };
    execFileSync(tool.lua, [path.join(__dirname, "spec/native.lua")], {
      env,
      stdio: "inherit",
    });
    execFileSync(tool.lua, [path.join(__dirname, "spec/contract.lua")], {
      env,
      stdio: "inherit",
    });
    execFileSync(tool.lua, [path.join(__dirname, "examples/contract.lua")], {
      env,
      stdio: "inherit",
    });
    runs.push(JSON.parse(fs.readFileSync(resultFile, "utf8")));
  }
  const result = { protocol: 1, sdk: "lua", runs };
  checkObservations("lua", readVectors(dir), result);
  if (process.env.VEXILLA_OBSERVATIONS_FILE) {
    fs.writeFileSync(
      process.env.VEXILLA_OBSERVATIONS_FILE,
      JSON.stringify(result)
    );
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
