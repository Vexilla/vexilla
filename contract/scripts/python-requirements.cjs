const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const lock = JSON.parse(
  fs.readFileSync(path.join(root, "clients/python/Pipfile.lock"))
);
const target = path.join(root, "clients/python/contract-requirements.txt");
const output =
  "# Exported from Pipfile.lock default dependencies, including environment markers.\n" +
  Object.entries(lock.default)
    .map(
      ([name, pkg]) =>
        name +
        pkg.version +
        (pkg.markers ? " ; " + pkg.markers : "") +
        " " +
        pkg.hashes.map((h) => "--hash=" + h).join(" ")
    )
    .join("\n") +
  "\n";
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== output) {
    throw Error(
      "Python contract dependencies are stale. Run pnpm contract:python:requirements."
    );
  }
} else {
  fs.writeFileSync(target, output);
}
