import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tsConfig from "./tsconfig.json";

const alias = Object.entries(tsConfig.paths).reduce(
  (mappedAlias, [pathAlias, [tsPath]]) => {
    const newKey = pathAlias.replace("/*", "");
    const newPath = path.resolve(__dirname, tsPath.replace("/*", ""));
    mappedAlias[newKey] = newPath;
    return mappedAlias;
  },
  {}
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
});
