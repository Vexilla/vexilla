const path = require("path");
const fs = require("fs-extra");
const liveServer = require("live-server");

const distPath = path.resolve(__dirname, "../dist");
const tempAppPath = path.resolve(__dirname, "../temp-app");
const appPath = path.resolve(distPath, "app");
fs.mkdirpSync(tempAppPath);
fs.mkdirpSync(appPath);
fs.copySync(distPath, tempAppPath);
fs.copySync(tempAppPath, appPath);
fs.removeSync(tempAppPath);

const params = {
  port: 8181,
  host: "0.0.0.0",
  root: distPath,
  file: path.resolve(appPath, "index.html"),
  wait: 1000,
  logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
};
liveServer.start(params);
