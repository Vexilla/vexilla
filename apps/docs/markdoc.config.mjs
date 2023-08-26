import { defineMarkdocConfig, component, nodes } from "@astrojs/markdoc/config";
import shiki from "@astrojs/markdoc/shiki";

export default defineMarkdocConfig({
  nodes: {
    heading: {
      ...nodes.heading,
      render: component("./src/components/docs/DocHeading.astro"),
    },
  },
  tags: {
    snippet: {
      render: component("./src/components/docs/CodeSnippet.astro"),
      attributes: {
        snippet: {
          type: String,
          default: "",
          required: true,
          errorLevel: "critical",
        },
      },
    },
  },
  extends: [
    shiki({
      // Choose from Shiki's built-in themes (or add your own)
      Default: "github-dark",
      // https://github.com/shikijs/shiki/blob/main/docs/themes.md
      // theme: "dracula",
      // Enable word wrap to prevent horizontal scrolling
      // Default: false
      wrap: true,
      langs: [],
    }),
  ],
});
