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
    continue;
  }

  if (!dirEntry.name.startsWith("client-")) {
    continue;
  }

  const tomlData = fs.readFileSync(path.resolve(dirEntry.path, "README.toml"), {
    encoding: "utf8",
  });

  const parsedToml = toml.parse(tomlData);

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

  fs.writeFileSync(path.resolve(dirEntry.path, "README.md"), templatedReadme);

  dirEntry = dir.readSync();
}
