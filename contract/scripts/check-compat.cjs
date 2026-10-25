const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { generateCompatibility } = require("./generate-compat.cjs");

const count = generateCompatibility({ check: true });
execFileSync(
  process.execPath,
  [path.join(__dirname, "generate-kotlin-numeric.cjs"), "--check"],
  { stdio: "inherit" }
);
console.log(
  `${count} SDK compatibility assets match the pinned publisher contract`
);
