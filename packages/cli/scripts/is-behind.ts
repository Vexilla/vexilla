import child_process from "child_process";

const childProcessResponse = child_process.spawnSync("git", [
  "rev-list",
  "HEAD...origin/main",
  "--count",
]);

const statusResponse = parseInt(
  childProcessResponse.output
    .map((buffer) => {
      if (!buffer) {
        return;
      }
      return buffer.toString("utf8").trim();
    })
    .filter((bufferString) => !!bufferString)
    .join(""),
  10
);

if (statusResponse) {
  process.exit(-1);
} else {
  process.exit(0);
}
