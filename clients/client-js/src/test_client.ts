import { VexillaManifest } from "@vexilla/types";
import { VexillaClient } from "./client";
import axios from "axios";

(async () => {
  let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
  const groupName = "Group 1";

  const client = new VexillaClient({
    baseUrl: "http://localhost:3000",
    environment: "dev",
    customInstanceHash: uuid,
  });

  await client.syncManifest();

  const flags = await client.getFlags(groupName, async (url: string) => {
    const response = await axios.get(url);
    return response.data;
  });

  client.setFlags(groupName, flags);

  console.log("FLAGS", JSON.stringify(flags, null, 2));

  const shouldGradual = client.should("testingWorkingGradual", groupName);

  console.log({ shouldGradual });

  if (!shouldGradual) {
    console.error("Should Gradual, but couldn't");
    process.exit(1);
  }

  const shouldNotGradual = client.should("testingNonWorkingGradual", groupName);

  if (shouldNotGradual) {
    console.error("Should Not Gradual, but could");
    process.exit(1);
  }
})();
