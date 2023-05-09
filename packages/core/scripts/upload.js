const path = require("path");
require("dotenv").config();
const upload = require("../src/upload");

(async () => {
  upload(
    process.env.AWS_BUCKET_NAME,
    "features.json",
    path.resolve(`${__dirname}/../data/features.json`)
  );
})();
