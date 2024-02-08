import chalk from "chalk";
import fs from "fs";
import path from "path";
import toml from "toml";
import mustache from "mustache";

const readmeTemplate = fs.readFileSync(
  path.resolve(__dirname, "README.mustache"),
  { encoding: "utf8" }
);

const dir = fs.opendirSync(path.resolve(__dirname, "../clients"));

let dirEntry = dir.readSync();

while (dirEntry) {
  if (!dirEntry.isDirectory()) {
    dirEntry = dir.readSync();
    continue;
  }

  // ignore old client libraries for now
  if (dirEntry.name.startsWith("client-")) {
    dirEntry = dir.readSync();
    continue;
  }

  console.log("Starting README for:", dirEntry.name);

  const tomlData = fs.readFileSync(
    path.resolve(dirEntry.path, dirEntry.name, "README.toml"),
    {
      encoding: "utf8",
    }
  );

  console.log("Loaded TOML for:", dirEntry.name);

  const parsedToml = toml.parse(tomlData);

  console.log("Parsed TOML for:", dirEntry.name);

  const templatedReadme = mustache.render(
    readmeTemplate,
    parsedToml,
    undefined,
    {
      escape: function (value) {
        return value;
      },
    }
  );

  console.log("Parsed template for:", dirEntry.name);

  fs.writeFileSync(
    path.resolve(dirEntry.path, dirEntry.name, "README.md"),
    templatedReadme
  );

  console.log("Output README for:", dirEntry.name);

  dirEntry = dir.readSync();
}
