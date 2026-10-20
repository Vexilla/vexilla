const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync(
        "git",
        ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        { cwd: root, encoding: "utf8" }
      ).split("\0");
let violations = 0;
for (const file of new Set(files)) {
  // Pagefind ships generated third-party search assets, rather than project source.
  if (/^apps\/docs\/(?:public\/_pagefind|src\/pagefind)\//.test(file)) {
    continue;
  }
  if (!/\.(?:[cm]?[jt]sx?)$/.test(file)) {
    continue;
  }
  const absolute = path.resolve(root, file);
  if (!fs.existsSync(absolute)) {
    continue;
  }
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(absolute, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  function check(body) {
    if (body && !ts.isBlock(body)) {
      const position = source.getLineAndCharacterOfPosition(
        body.getStart(source)
      );
      console.error(
        `${file}:${position.line + 1}: control-flow bodies require braces`
      );
      violations++;
    }
  }
  function visit(node) {
    if (ts.isIfStatement(node)) {
      check(node.thenStatement);
      if (node.elseStatement && !ts.isIfStatement(node.elseStatement)) {
        check(node.elseStatement);
      }
    } else if (
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node)
    ) {
      check(node.statement);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (violations) {
  process.exitCode = 1;
} else {
  console.log("All JavaScript/TypeScript control-flow bodies use braces.");
}
