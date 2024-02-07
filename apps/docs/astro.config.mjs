import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import toml from "astro-toml";

// https://astro.build/config
export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        external: ["@/pagefind/pagefind"],
      },
    },
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react({
      // This was needed at one point with Astro 2.x
      // Not sure if still needed for some special edge case.
      // experimentalReactChildren: true,
    }),
    markdoc(),
    toml(),
  ],
});
