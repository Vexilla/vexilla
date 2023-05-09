import Case from "case";

const disclaimerText =
  "This file has been generated from your remote Vexilla Feature Flags file. You should NOT modify this file directly. It is encouraged to gitignore this file and generate it on the fly during build/compilation.";

type Language =
  | "js"
  | "ts"
  | "elixir"
  | "php"
  | "python"
  | "csharp"
  | "go"
  | "ruby"
  | "rust"
  | "lua"
  | "dart";

const languageTransformers: Record<
  Language,
  (tags: string[], keys: string[]) => string
> = {
  js: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `  ${Case.camel(tag)}: "${tag}",`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `  ${Case.camel(key)}: "${key}",`)
      .join("\n");

    return `// ${disclaimerText}

export const VexillaTags = {
${tagsString}
};

export const VexillaKeys = {
${keysString}
};
`;
  },
  ts: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `  ${Case.pascal(tag)} = "${tag}",`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `  ${Case.pascal(key)} = "${key}",`)
      .join("\n");

    return `// ${disclaimerText}

export enum VexillaTags {
${tagsString}
};

export enum VexillaKeys {
${keysString}
};
`;
  },
  elixir: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `:vexilla_tag_${Case.snake(tag)} = "${tag}"`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `:vexilla_key_${Case.snake(key)} = "${key}"`)
      .join("\n");

    return `# ${disclaimerText}

# Tags
${tagsString}

# Keys
${keysString}
`;
  },
  php: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `  public static $${Case.camel(tag)} = "${tag}";`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `  public static $${Case.camel(key)} = "${key}";`)
      .join("\n");

    return `<?php
namespace Vexilla;

// ${disclaimerText}

// Tags
class Tags {
${tagsString}
}

// Keys
class Keys {
${keysString}
}
`;
  },
  python: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `    ${Case.constant(tag)} = "${tag}"`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `    ${Case.constant(key)} = "${key}"`)
      .join("\n");

    return `# ${disclaimerText}

from enum import Enum

class VexillaTags(Enum):
${tagsString}


class VexillaKeys(Enum):
${keysString}

`;
  },
  csharp: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map(
        (tag: string) =>
          `    public static readonly string ${Case.pascal(tag)}  = "${tag}";`
      )
      .join("\n");

    const keysString = keys
      .map(
        (key: string) =>
          `    public static readonly string ${Case.pascal(key)}  = "${key}";`
      )
      .join("\n");

    return `// ${disclaimerText}

namespace Vexilla.Client {
  public static class Tags {
${tagsString}
  }

  public static class Flags {
${keysString}
  }
}`;
  },
  go: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map(
        (tag: string) => `const VexillaTag${Case.pascal(tag)} string = "${tag}"`
      )
      .join("\n");

    const keysString = keys
      .map(
        (key: string) => `const VexillaKey${Case.pascal(key)} string = "${key}"`
      )
      .join("\n");

    return `// ${disclaimerText}

package vexillaMain

// Tags
${tagsString}

// Keys
${keysString}
`;
  },
  rust: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map(
        (tag: string) =>
          `static VEXILLA_TAG_${Case.constant(tag)}: &str = "${tag}";`
      )
      .join("\n");

    const keysString = keys
      .map(
        (key: string) =>
          `static VEXILLA_KEY_${Case.constant(key)}: &str = "${key}";`
      )
      .join("\n");

    return `// ${disclaimerText}

// Tags
${tagsString}

// Keys
${keysString}
`;
  },
  ruby: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `    ${Case.constant(tag)} = "${tag}"`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `    ${Case.constant(key)} = "${key}"`)
      .join("\n");

    return `# ${disclaimerText}

module Vexilla
  class Tags
${tagsString}
  end

  class Flags
${keysString}
  end
end
`;
  },
  lua: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `    ${Case.constant(tag)} = "${tag}"`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `    ${Case.constant(key)} = "${key}"`)
      .join("\n");

    return `-- ${disclaimerText}

return {
  Tags = {
${tagsString}
  }
  Flags = {
${keysString}
  }
}
`;
  },

  dart: function (tags: string[], keys: string[]) {
    const tagsString = tags
      .map((tag: string) => `  static String ${Case.camel(tag)} = "${tag}";`)
      .join("\n");

    const keysString = keys
      .map((key: string) => `  static String ${Case.camel(key)} = "${key}";`)
      .join("\n");

    return `// ${disclaimerText}

abstract class VexillaTags {
${tagsString}
}

abstract class VexillaFlags {
${keysString}
}
`;
  },
};

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
  py: "python",
  python: "python",
  ex: "elixir",
  elixir: "elixir",
  rb: "ruby",
  ruby: "ruby",
  rs: "rust",
  rust: "rust",
  lua: "lua",
  flutter: "dart",
  dart: "dart",
};

export function transformConstants(
  language: string,
  tags: string[],
  keys: string[]
) {
  const coercedLanguage = languageAliases[language.toLowerCase()];

  const transformer = languageTransformers[coercedLanguage];

  if (!transformer) {
    throw new Error(`No Transformer found for language: ${language}`);
  }
  return transformer(tags, keys);
}
