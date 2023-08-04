import { VexillaManifest } from "@vexilla/types";
import { VexillaClient } from "./client";
import axios from "axios";
import { labelledAssert } from "./utils/testing";

(async () => {
  let uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
  const groupName = "Gradual";

  const client = new VexillaClient(
    {
      baseUrl: "http://localhost:3000",
      environment: "dev",
      customInstanceHash: uuid,
    },
    false
  );

  await client.syncManifest();

  const flags = await client.getFlags(groupName, async (url: string) => {
    const response = await axios.get(url);
    return response.data;
  });

  client.setFlags(groupName, flags);

  const shouldGradual = client.should(groupName, "testingWorkingGradual");

  if (!shouldGradual) {
    console.error("Should Gradual, but couldn't");
    process.exit(1);
  }

  const shouldNotGradual = client.should(groupName, "testingNonWorkingGradual");

  if (shouldNotGradual) {
    console.error("Should Not Gradual, but could");
    process.exit(1);
  }

  await client.syncFlags("Scheduled", (url) => {
    return fetch(url).then((response) => response.json());
  });

  const shouldBeforeGlobal = client.should("Scheduled", "beforeGlobal");
  labelledAssert(shouldBeforeGlobal, "Should not be able to beforeGlobal");

  // let before_global_scheduled = client.should("Scheduled", "beforeGlobal").unwrap();
  // assert!(!before_global_scheduled);

  // let during_global_scheduled = client.should("Scheduled", "duringGlobal").unwrap();
  // assert!(during_global_scheduled);

  // let after_global_scheduled = client.should("Scheduled", "afterGlobal").unwrap();
  // assert!(!after_global_scheduled);
})();
