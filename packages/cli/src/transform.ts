import Case from "case";
import mustache from "mustache";
import type { Language } from "./types";
import { Group, PublishedGroup } from "@vexilla/types";
import { templates } from "./templates";

const disclaimerText = `This file has been generated from your remote Vexilla Feature Flags file.

  You should NOT modify this file directly.

  It is encouraged to gitignore this file and generate it on-the-fly during build/compilation.`;

const languageTransformers: Record<
  Language,
  (groups: PublishedGroup[], typePrefix?: string, typeSuffix?: string) => string
> = {
  js: function (groups: PublishedGroup[], typePrefix = "", typeSuffix = "") {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.camel, Case.pascal)
    );
    return mustache.render(templates.js, {
      disclaimerText,
      groups: groupsOutput,
    });
  },
  ts: function (groups: PublishedGroup[], typePrefix = "", typeSuffix = "") {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.camel, Case.pascal)
    );
    return mustache.render(templates.ts, {
      disclaimerText,
      groups: groupsOutput,
    });
  },

  rust: function (groups: PublishedGroup[], typePrefix = "", typeSuffix = "") {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.pascal)
    );
    return mustache.render(templates.rust, {
      disclaimerText,
      groups: groupsOutput,
    });
  },
  go: function (groups: PublishedGroup[], typePrefix = "", typeSuffix = "") {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.pascal)
    );
    return mustache.render(templates.go, {
      disclaimerText,
      groups: groupsOutput,
    });
  },
  csharp: function (
    groups: PublishedGroup[],
    typePrefix = "",
    typeSuffix = ""
  ) {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.pascal)
    );
    return mustache.render(templates.csharp, {
      disclaimerText,
      groups: groupsOutput,
    });
  },
  elixir: function (
    groups: PublishedGroup[],
    typePrefix = "",
    typeSuffix = ""
  ) {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.snake, Case.pascal, Case.pascal)
    );
    return mustache.render(templates.elixir, {
      disclaimerText,
      groups: groupsOutput,
    });
  },
  php: function (groups: PublishedGroup[], typePrefix = "", typeSuffix = "") {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.pascal)
    );

    return mustache.render(templates.php, {
      disclaimerText,
      groups: groupsOutput,
    });
  },

  python: function (
    groups: PublishedGroup[],
    typePrefix = "",
    typeSuffix = ""
  ) {
    const groupsOutput = groups.map(
      parseGroup(typePrefix, typeSuffix, Case.pascal)
    );

    return mustache.render(templates.python, {
      disclaimerText,
      groups: groupsOutput,
    });
  },

  //   csharp: function (groups: PublishedGroup[], typePrefix = "") {
  //     const tagsString = tags
  //       .map(
  //         (tag: string) =>
  //           `    public static readonly string ${Case.pascal(tag)}  = "${tag}";`
  //       )
  //       .join("\n");

  //     const keysString = keys
  //       .map(
  //         (key: string) =>
  //           `    public static readonly string ${Case.pascal(key)}  = "${key}";`
  //       )
  //       .join("\n");

  //     return `// ${disclaimerText}

  // namespace Vexilla.Client {
  //   public static class Tags {
  // ${tagsString}
  //   }

  //   public static class Flags {
  // ${keysString}
  //   }
  // }`;
  //   },

  //   ruby: function (groups: PublishedGroup[], typePrefix = "") {
  //     const tagsString = tags
  //       .map((tag: string) => `    ${Case.constant(tag)} = "${tag}"`)
  //       .join("\n");

  //     const keysString = keys
  //       .map((key: string) => `    ${Case.constant(key)} = "${key}"`)
  //       .join("\n");

  //     return `# ${disclaimerText}

  // module Vexilla
  //   class Tags
  // ${tagsString}
  //   end

  //   class Flags
  // ${keysString}
  //   end
  // end
  // `;
  //   },

  //   lua: function (groups: PublishedGroup[], typePrefix = "") {
  //     const tagsString = tags
  //       .map((tag: string) => `    ${Case.constant(tag)} = "${tag}"`)
  //       .join("\n");

  //     const keysString = keys
  //       .map((key: string) => `    ${Case.constant(key)} = "${key}"`)
  //       .join("\n");

  //     return `-- ${disclaimerText}

  // return {
  //   Tags = {
  // ${tagsString}
  //   }
  //   Flags = {
  // ${keysString}
  //   }
  // }
  // `;
  //   },

  //   dart: function (groups: PublishedGroup[], typePrefix = "") {
  //     const tagsString = tags
  //       .map((tag: string) => `  static String ${Case.camel(tag)} = "${tag}";`)
  //       .join("\n");

  //     const keysString = keys
  //       .map((key: string) => `  static String ${Case.camel(key)} = "${key}";`)
  //       .join("\n");

  //     return `// ${disclaimerText}

  // abstract class VexillaTags {
  // ${tagsString}
  // }

  // abstract class VexillaFlags {
  // ${keysString}
  // }
  // `;
  //   },
};

function parseGroup(
  typePrefix: string,
  typeSuffix: string,
  genericNameTransformer: typeof Case.pascal,
  topLevelNameTransformer?: typeof Case.pascal,
  safeNameTransformer?: typeof Case.pascal
) {
  const _topLevelNameTransformer =
    topLevelNameTransformer ?? genericNameTransformer;
  const _safeNameTransformer = safeNameTransformer ?? genericNameTransformer;

  return (group: PublishedGroup) => {
    return {
      rawName: group.name,
      safeName: _safeNameTransformer(group.name),
      name: _topLevelNameTransformer(
        `${typePrefix} ${group.name} ${typeSuffix}`.trim()
      ),
      id: group.groupId,
      environments: Object.values(group.environments).map((environment) => {
        return {
          rawName: environment.name,
          safeName: _safeNameTransformer(environment.name),
          name: genericNameTransformer(environment.name),
          id: environment.environmentId,
        };
      }),
      features: Object.values(group.features).map((feature) => {
        return {
          rawName: feature.name,
          safeName: _safeNameTransformer(feature.name),
          name: genericNameTransformer(feature.name),
          id: feature.featureId,
        };
      }),
    };
  };
}

const languageAliases: Record<string, Language> = {
  cs: "csharp",
  "c#": "csharp",
  csharp: "csharp",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  golang: "go",
  go: "go",
  php: "php",
  // py: "python",
  python: "python",
  ex: "elixir",
  elixir: "elixir",
  // rb: "ruby",
  // ruby: "ruby",
  rs: "rust",
  rust: "rust",
  // lua: "lua",
  // flutter: "dart",
  // dart: "dart",
};

export function transformConstants(
  language: string,
  groups: PublishedGroup[],
  typePrefix = "",
  typeSuffix = ""
) {
  const coercedLanguage = languageAliases[language.toLowerCase()];

  const transformer = languageTransformers[coercedLanguage];

  if (!transformer) {
    throw new Error(`No Transformer found for language: ${language}`);
  }
  return transformer(groups, typePrefix, typeSuffix);
}
