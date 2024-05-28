import fs from "fs";
import path from "path";

// Paths
const typesPath = path.resolve(
  __dirname,
  "../../../packages/types/src/types.ts"
);
const indexDtsPath = path.resolve(__dirname, "../dist/index.d.ts");

// Content
const typesContent = fs.readFileSync(typesPath, "utf8");
const indexDtsContent = fs.readFileSync(indexDtsPath, "utf8");

// Work
let indexLines = indexDtsContent.split("\n");
const newIndexDtsContent = `
${typesContent}
${indexLines.slice(1, indexLines.length).join("\n")}
`;

fs.writeFileSync(indexDtsPath, newIndexDtsContent);
