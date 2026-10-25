const fs = require("node:fs");
const path = require("node:path");
const rows = [];
const add = (bits) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(bits);
  const n = b.readDoubleBE();
  if (Number.isFinite(n)) {
    rows.push({ bits: bits.toString(16).padStart(16, "0"), text: String(n) });
  }
};
for (const n of [
  0,
  -0,
  1e23,
  1e-7,
  1e-6,
  1e20,
  1e21,
  Number.MIN_VALUE,
  Number.MAX_VALUE,
  9007199254740992,
]) {
  const b = Buffer.alloc(8);
  b.writeDoubleBE(n);
  add(b.readBigUInt64BE());
}
let state = 123456789n;
for (let i = 0; i < 6000; i++) {
  state =
    (state * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n);
  add(state);
}
const target = path.resolve(
  __dirname,
  "../../clients/kotlin/src/test/resources/numeric-regressions.json"
);
const content = JSON.stringify(rows) + "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== content) {
    throw Error("Kotlin numeric fixture drift");
  }
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
console.log(`${rows.length} deterministic Kotlin numeric references`);
