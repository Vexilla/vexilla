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

  await client.syncManifest(async (url: string) => {
    const response = await axios.get(url);
    return response.data;
  });

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
  labelledAssert(!shouldBeforeGlobal, "Should not be able to beforeGlobal");

  const shouldDuringGlobal = client.should("Scheduled", "duringGlobal");
  labelledAssert(shouldDuringGlobal, "Should not be able to duringGlobal");

  const shouldAfterGlobal = client.should("Scheduled", "afterGlobal");
  labelledAssert(!shouldAfterGlobal, "Should not be able to afterGlobal");

  const shouldBeforeGlobalStartEnd = client.should(
    "Scheduled",
    "beforeGlobalStartEnd"
  );
  labelledAssert(
    !shouldBeforeGlobalStartEnd,
    "Should not be able to beforeGlobalStartEnd"
  );

  const shouldDuringGlobalStartEnd = client.should(
    "Scheduled",
    "duringGlobalStartEnd"
  );
  labelledAssert(
    shouldDuringGlobalStartEnd,
    "Should not be able to duringGlobalStartEnd"
  );

  const shouldAfterGlobalStartEnd = client.should(
    "Scheduled",
    "afterGlobalStartEnd"
  );
  labelledAssert(
    !shouldAfterGlobalStartEnd,
    "Should not be able to afterGlobalStartEnd"
  );

  const shouldBeforeGlobalDaily = client.should(
    "Scheduled",
    "beforeGlobalDaily"
  );
  labelledAssert(
    !shouldBeforeGlobalDaily,
    "Should not be able to beforeGlobalDaily"
  );

  const shouldDuringGlobalDaily = client.should(
    "Scheduled",
    "duringGlobalDaily"
  );
  labelledAssert(
    shouldDuringGlobalDaily,
    "Should not be able to duringGlobalDaily"
  );

  const shouldAfterGlobalDaily = client.should("Scheduled", "afterGlobalDaily");
  labelledAssert(
    !shouldAfterGlobalDaily,
    "Should not be able to afterGlobalDaily"
  );

  await client.syncFlags("Selective", (url) => {
    return fetch(url).then((response) => response.json());
  });

  const shouldSelectiveString = client.should("Selective", "String");
  labelledAssert(
    shouldSelectiveString,
    "Should be able to shouldSelectiveString"
  );

  const shouldSelectiveStringCustom = client.should(
    "Selective",
    "String",
    "shouldBeInList"
  );
  labelledAssert(
    shouldSelectiveStringCustom,
    "Should be able to shouldSelectiveStringCustom"
  );

  const shouldSelectiveNumber = client.should("Selective", "Number", 42);
  labelledAssert(
    shouldSelectiveNumber,
    "Should be able to shouldSelectiveNumber"
  );

  await client.syncFlags("Value", (url) => {
    return fetch(url).then((response) => response.json());
  });

  const valueString = client.value("Value", "String");
  labelledAssert(valueString === "foo", "Value for String should be 'foo'");

  const valueInt = client.value("Value", "Integer");
  labelledAssert(valueInt === 42, "Value for Integer should be 42");

  const valueFloat = client.value("Value", "Float");
  labelledAssert(valueFloat === 42.42, "Value for Float should be 42.42");
})();
