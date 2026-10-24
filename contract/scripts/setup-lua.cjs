// Isolated, pinned native tools: node contract/scripts/setup-lua.cjs [output-directory]
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const lock = require("../lua-toolchain.json");
const root = path.resolve(__dirname, "../..");
const out = path.resolve(
  process.argv[2] ||
    process.env.VEXILLA_LUA_TOOLCHAIN ||
    path.join(root, ".contract-toolchains/lua")
);
const downloads = path.join(out, "downloads");
fs.mkdirSync(downloads, { recursive: true });
if (!["darwin", "linux"].includes(process.platform)) {
  throw Error("Native contract setup currently supports Linux and macOS");
}
function run(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        MACOSX_DEPLOYMENT_TARGET:
          process.env.MACOSX_DEPLOYMENT_TARGET || "11.0",
      },
    });
  } catch (error) {
    process.stderr.write(
      String(error.stdout || "").slice(-5000) +
        String(error.stderr || "").slice(-5000)
    );
    throw error;
  }
}
function download(file, url, hash) {
  const dest = path.join(downloads, file);
  if (!fs.existsSync(dest)) {
    console.log("Downloading " + file);
    run("curl", [
      "-fLsS",
      "--retry",
      "3",
      "--max-time",
      "120",
      url,
      "-o",
      dest,
    ]);
  }
  if (
    crypto.createHash("sha256").update(fs.readFileSync(dest)).digest("hex") !==
    hash
  ) {
    throw Error("Source checksum mismatch: " + dest);
  }
  return dest;
}
function extract(archive, destination) {
  fs.mkdirSync(destination, { recursive: true });
  run("tar", ["-xzf", archive, "--strip-components=1", "-C", destination]);
}
const socketArchive = download(
  "luasocket.tar.gz",
  lock.luasocket.url,
  lock.luasocket.sha256
);
const jsonFile = download("dkjson.lua", lock.dkjson.url, lock.dkjson.sha256);
const rocksArchive = download(
  "luarocks.tar.gz",
  lock.luarocks.url,
  lock.luarocks.sha256
);
const tools = [];
for (const runtime of lock.runtimes) {
  const prefix = path.join(out, runtime.id);
  const source = path.join(out, "sources", runtime.id);
  const jit = runtime.id === "luajit-2.1";
  const luaVersion = jit ? "5.1" : runtime.version.slice(0, 3);
  const interpreter = jit ? "luajit" : "lua";
  const lua = path.join(prefix, "bin", interpreter);
  const stamp = path.join(prefix, "verified-setup.json");
  const identity = JSON.stringify({
    lock,
    runtime,
    platform: process.platform,
    arch: process.arch,
    setup: crypto
      .createHash("sha256")
      .update(fs.readFileSync(__filename))
      .digest("hex"),
  });
  const rocksPrefix = path.join(prefix, "luarocks");
  if (!fs.existsSync(stamp) || fs.readFileSync(stamp, "utf8") !== identity) {
    console.log("Building " + runtime.id + " " + runtime.version);
    const archive = download(
      runtime.id + ".tar.gz",
      jit
        ? `https://github.com/LuaJIT/LuaJIT/archive/${runtime.commit}.tar.gz`
        : `https://www.lua.org/ftp/lua-${runtime.version}.tar.gz`,
      runtime.sha256
    );
    extract(archive, source);
    if (jit) {
      run("make", ["-j4", "PREFIX=" + prefix], source);
      run("make", ["install", "PREFIX=" + prefix], source);
    } else {
      // Avoid a readline dependency; dynamic modules and POSIX clocks are enabled.
      run("make", ["clean"], source);
      run(
        "make",
        [
          "all",
          "-j4",
          "MYCFLAGS=-fPIC -DLUA_USE_POSIX -DLUA_USE_DLOPEN",
          "MYLIBS=-ldl",
          "MYLDFLAGS=" + (process.platform === "linux" ? "-Wl,-E" : ""),
        ],
        path.join(source, "src")
      );
      run("make", ["install", "INSTALL_TOP=" + prefix], source);
    }
    const socketSource = path.join(out, "sources", runtime.id + "-socket");
    extract(socketArchive, socketSource);
    run(
      "make",
      [
        "all",
        "install",
        "PLAT=" + (process.platform === "darwin" ? "macosx" : "linux"),
        "LUAV=" + luaVersion,
        "LUAINC_" +
          (process.platform === "darwin" ? "macosx" : "linux") +
          "=" +
          path.join(prefix, jit ? "include/luajit-2.1" : "include"),
        "prefix=" + prefix,
      ],
      socketSource
    );
    fs.copyFileSync(
      jsonFile,
      path.join(prefix, "share/lua", luaVersion, "dkjson.lua")
    );
    const rocksSource = path.join(out, "sources", runtime.id + "-rocks");
    extract(rocksArchive, rocksSource);
    run(
      "./configure",
      [
        "--prefix=" + rocksPrefix,
        "--rocks-tree=" + path.join(prefix, "rocks"),
        "--lua-version=" + luaVersion,
        "--with-lua=" + prefix,
        "--with-lua-interpreter=" + interpreter,
        "--with-lua-include=" +
          path.join(prefix, jit ? "include/luajit-2.1" : "include"),
        "--force-config",
      ],
      rocksSource
    );
    run("make", ["install"], rocksSource);
  }
  const env = {
    LUA_PATH:
      path.join(prefix, "share/lua", luaVersion, "?.lua") +
      ";" +
      path.join(prefix, "share/lua", luaVersion, "?/init.lua"),
    LUA_CPATH: path.join(prefix, "lib/lua", luaVersion, "?.so"),
  };
  const proof = execFileSync(
    lua,
    [
      "-e",
      `local s,j=require('socket'),require('dkjson'); local t=s.gettime(); s.sleep(0.002); assert(s.gettime()>t and t%1~=0); local o,_,err=j.decode('{"a":[],"o":{},"n":null}',1,j.null); assert(not err and o.n==j.null and getmetatable(o.a).__jsontype=='array' and getmetatable(o.o).__jsontype=='object'); print(jit and jit.version or _VERSION,j.version,s._VERSION)`,
    ],
    { env: { ...process.env, ...env }, encoding: "utf8" }
  ).trim();
  console.log("Verified " + runtime.id + ": " + proof);
  fs.writeFileSync(stamp, identity);
  tools.push({
    id: runtime.id,
    version: runtime.version,
    luaVersion,
    lua,
    prefix,
    luarocks: path.join(rocksPrefix, "bin/luarocks"),
    env,
  });
}
fs.writeFileSync(
  path.join(out, "tools.json"),
  JSON.stringify(tools, null, 2) + "\n"
);
console.log("Toolchain manifest: " + path.join(out, "tools.json"));
