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
    boxplot: {
      render: component("./src/components/blog/BoxPlot.astro"),
      attributes: {
        title: {
          type: String,
          default: "",
          required: false,
          errorLevel: "critical",
        },
        dataPath: {
          type: String,
          default: "",
          required: true,
          errorLevel: "critical",
        },
        count: {
          type: Number,
          default: 10,
          required: true,
          errorLevel: "critical",
        },
        iterations: {
          type: Number,
          default: 10,
          required: false,
          errorLevel: "critical",
        },
        valueKey: {
          type: String,
          default: "value",
          required: false,
          errorLevel: "critical",
        },
        lowerBound: {
          type: Number,
          default: 0,
          required: false,
          errorLevel: "critical",
        },
        upperBound: {
          type: Number,
          default: 1,
          required: false,
          errorLevel: "critical",
        },
      },
    },
  },
  extends: [
    shiki({
      // Choose from Shiki's built-in themes (or add your own)
      // Default: "github-dark",
      // https://github.com/shikijs/shiki/blob/main/docs/themes.md
      // theme: "dracula",
      // Enable word wrap to prevent horizontal scrolling
      // Default: false
      wrap: true,
      langs: [],
    }),
  ],
});
