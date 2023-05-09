import path from "path";
import fs from "fs-extra";
import axios from "axios";
import { VexillaFlags } from "@vexilla/client";

import { transformConstants } from "./transform";

export async function outputTypes(
  inputUrl: string,
  outputPath: string,
  targetLanguage: string,
  typePrefix = ""
) {
  const response = await axios.get<VexillaFlags>(inputUrl);

  const flagsJson = response.data;

  const tagsSet = new Set<string>();
  const keysSet = new Set<string>();

  Object.values(flagsJson.environments).forEach((environment) => {
    Object.entries(environment).forEach(([tag, featureSet]) => {
      tagsSet.add(tag);
      Object.keys(featureSet).forEach((key) => {
        keysSet.add(key);
      });
    });
  });

  const tags = Array.from(tagsSet);
  const keys = Array.from(keysSet);

  const result = transformConstants(targetLanguage, tags, keys);

  fs.outputFileSync(path.resolve(process.cwd(), outputPath), result);
}
