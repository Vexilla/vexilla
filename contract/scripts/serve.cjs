// Optional local server for SDKs that require HTTP; independent of dynamic scheduling fixtures.
const http = require("node:http");
const { readFileSync } = require("node:fs");
const { resolve, basename } = require("node:path");
const root = resolve(process.env.VEXILLA_CONTRACT_DIR || ".contract-artifacts");
http
  .createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname.slice(1)
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (name !== basename(name) || !name.endsWith(".json")) {
      res.writeHead(404).end();
      return;
    }
    try {
      res.setHeader("Content-Type", "application/json");
      res.end(readFileSync(resolve(root, name)));
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(Number(process.env.PORT || 3001), "127.0.0.1");
