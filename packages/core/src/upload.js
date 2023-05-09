const { S3 } = require("aws-sdk");

// const { S3 } = require("@aws-sdk/client-s3");
require("dotenv").config();

const fs = require("fs-extra");

module.exports = async function (bucketName, fileKey, localFilePath) {
  const s3 = new S3();

  const fileData = await fs.readFile(localFilePath);

  const params = {
    ACL: "public-read",
    Body: fileData,
    Bucket: bucketName,
    Key: fileKey,
  };

  const data = s3
    .putObject(params)
    .promise()
    .catch((err) => {
      console.log(err, err.stack);
    });
  console.log("Success: ", data);
};
