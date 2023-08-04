import express from "express";
import path from "path";
import fs from "fs";
import mustache from "mustache";
import dayjs from "dayjs";

const app = express();
const port = 3000;

const scheduledGroupId = "Jz0rgEv0epyCb6z58or72";

app.get("/:fileName", (req, res) => {
  const { fileName } = req.params;
  if (fileName === `${scheduledGroupId}.json`) {
    const template = fs.readFileSync(
      path.resolve(__dirname, "scheduled.mustache"),
      { encoding: "utf8" }
    );
    const fileContents = mustache.render(template, {
      beforeGlobal: {
        start: dayjs().add(1, "day").unix() * 1000,
        end: dayjs().add(3, "day").unix() * 1000,
      },
      duringGlobal: {
        start: dayjs().subtract(1, "day").unix() * 1000,
        end: dayjs().add(1, "day").unix() * 1000,
      },
      afterGlobal: {
        start: dayjs().subtract(3, "day").unix() * 1000,
        end: dayjs().subtract(1, "day").unix() * 1000,
      },

      beforeGlobalStartEnd: {
        start: dayjs().unix() * 1000,
        end: dayjs().add(2, "day").unix() * 1000,
        startTime: getZeroRelativeTime().add(1, "hour").unix() * 1000,
        endTime: getZeroRelativeTime().add(3, "hour").unix() * 1000,
      },
      duringGlobalStartEnd: {
        start: dayjs().unix() * 1000,
        end: dayjs().add(2, "day").unix() * 1000,
        startTime: getZeroRelativeTime().subtract(1, "hour").unix() * 1000,
        endTime: getZeroRelativeTime().add(2, "hour").unix() * 1000,
      },
      afterGlobalStartEnd: {
        start: dayjs().subtract(2, "day").unix() * 1000,
        end: dayjs().unix() * 1000,
        startTime: getZeroRelativeTime().subtract(3, "hour").unix() * 1000,
        endTime: getZeroRelativeTime().subtract(1, "hour").unix() * 1000,
      },

      beforeGlobalDaily: {
        start: dayjs().subtract(1, "day").unix() * 1000,
        end: dayjs().add(1, "day").unix() * 1000,
        startTime: getZeroRelativeTime().subtract(3, "hour").unix() * 1000,
        endTime: getZeroRelativeTime().subtract(1, "hour").unix() * 1000,
      },
      duringGlobalDaily: {
        start: dayjs().subtract(1, "day").unix() * 1000,
        end: dayjs().add(1, "day").unix() * 1000,
        startTime: getZeroRelativeTime().subtract(1, "hour").unix() * 1000,
        endTime: getZeroRelativeTime().add(1, "hour").unix() * 1000,
      },
      afterGlobalDaily: {
        start: dayjs().subtract(1, "day").unix() * 1000,
        end: dayjs().add(1, "day").unix() * 1000,
        startTime: getZeroRelativeTime().subtract(3, "hour").unix() * 1000,
        endTime: getZeroRelativeTime().subtract(1, "hour").unix() * 1000,
      },
    });

    res.send(fileContents);
  } else {
    res.sendFile(path.resolve(__dirname, "fixtures", fileName));
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function getZeroRelativeTime() {
  const now = dayjs();

  return dayjs(0)
    .set("hour", now.hour())
    .set("minute", now.minute())
    .set("second", now.second());
}
