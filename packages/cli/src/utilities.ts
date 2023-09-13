import path from "path";
import fs from "fs-extra";
import axios from "axios";
import { PublishedGroup, VexillaFlags, VexillaManifest } from "@vexilla/types";

import { transformConstants } from "./transform";

export async function outputTypes(
  inputUrl: string,
  outputPath: string,
  targetLanguage: string,
  typePrefix = "",
  typeSuffix = ""
) {
  const response = await axios.get<VexillaManifest>(
    `${inputUrl}/manifest.json`
  );

  const manifest = response.data;

  const groups = await Promise.all(
    manifest.groups.map(async ({ groupId }) => {
      const response = await axios.get(`${inputUrl}/${groupId}.json`);
      return response.data as PublishedGroup;
    })
  );

  const result = transformConstants(
    targetLanguage,
    groups,
    typePrefix,
    typeSuffix
  );

  fs.outputFileSync(path.resolve(process.cwd(), outputPath), result);
}
