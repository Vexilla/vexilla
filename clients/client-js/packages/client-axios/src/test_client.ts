import { VexillaClient } from "./client";

(async () => {
  let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";

  const client = new VexillaClient({
    baseUrl:
      "http://streamparrot-feature-flags.s3-website-us-east-1.amazonaws.com",
    environment: "dev",
    customInstanceHash: uuid,
  });

  const flags = await client.getFlags("features.json");

  client.setFlags(flags);

  const shouldGradual = client.should("testingWorkingGradual");
  const shouldNotGradual = client.should("testingNonWorkingGradual");

  if (!shouldGradual) {
    console.error("Should Gradual, but couldn't");
    process.exit(1);
  }

  if (shouldNotGradual) {
    console.error("Should Not Gradual, but could");
    process.exit(1);
  }
})();
