import { Language } from "./types";

export const templates: Record<Language, string> = {
  js: `
/*
  {{{disclaimerText}}}
*/

{{#groups}}
export const {{{name}}} = {
  name: "{{{rawName}}}",
  id: "{{{id}}}",
  environments: {
    {{#environments}}
    {{{name}}}: "{{{id}}}",
    {{/environments}}
  },
  features: {
    {{#features}}
    {{{name}}}: "{{{id}}}",
    {{/features}}
  },
};

{{/groups}}
`,
  ts: `
/*
  {{{disclaimerText}}}
*/

{{#groups}}
export const {{{name}}}Group = {
  name: "{{{rawName}}}",
  id: "{{{id}}}",
  environments: {
    {{#environments}}
    {{{name}}}: "{{{id}}}",
    {{/environments}}
  },
  features: {
    {{#features}}
    {{{name}}}: "{{{id}}}",
    {{/features}}
  },
} as const;

{{/groups}}
`,
  rust: `
/*
  {{{disclaimerText}}}
*/


{{#groups}}
pub mod {{{name}}}Group {
    pub const NAME: &str = "{{{rawName}}}";
    pub const ID: &str = "{{{id}}}";

    pub enum Environments {
        {{#environments}}
        {{{name}}},
        {{/environments}}
    }

    impl Into<&str> for Environments {
      fn into(self) -> &'static str {
            match self {
                {{#environments}}
                Environments::{{{name}}} => "{{{id}}}",
                {{/environments}}
            }
        }
    }

    pub enum Features {
        {{#features}}
        {{{name}}},
        {{/features}}
    }

    impl Into<&str> for Features {
      fn into(self) -> &'static str {
            match self {
                {{#features}}
                Features::{{{name}}} => "{{{id}}}",
                {{/features}}
            }
        }
    }
}

{{/groups}}

`,
  go: `
/*
  {{{disclaimerText}}}
*/

package vexillaTypes

{{#groups}}

type {{{name}}}Environments struct {
  {{#environments}}
  {{{name}}} func () string
  {{/environments}}
}

type {{{name}}}Features struct {
  {{#features}}
  {{{name}}} func () string
  {{/features}}
}

type {{{name}}}Group struct {
  Name func () string
  ID func () string
  Environments func () {{{name}}}Environments
  Features func () {{{name}}}Features
}

var {{{name}}}Group = func () {{{name}}}Group {
  return {{{name}}}Group {
    Name: func () string { return "{{{rawName}}}" },
    ID: func () string { return "{{{id}}}" },
    Environments: func () {{{name}}}Environments {
      return {{{name}}}Environments {
        {{#environments}}
        {{{name}}}: func () string { return "{{{id}}}" },
        {{/environments}}
      }
    } ,
    Features: func () {{{safeName}}}Features {
      return {{{name}}}Features {
        {{#features}}
        {{{name}}}: func () string { return "{{{id}}}" },
        {{/features}}
      }
    },
  }
}
{{/groups}}
`,
  csharp: `
/*
{{{disclaimerText}}}
*/

namespace Vexilla.Client {
    {{#groups}}
    public static class {{{name}}}Group {
        public static string Name = "{{{rawName}}}";
        public static string GroupId = "{{{id}}}";

        public static class Environments {
            {{#environments}}
            public static string {{{name}}} = "{{{id}}}";
            {{/environments}}
        }

        public static class Features {
            {{#features}}
            public static string {{{name}}} = "{{{id}}}";
            {{/features}}
        }
    }
    {{/groups}}
}
`,
  elixir: `
"""
{{{disclaimerText}}}
"""

{{#groups}}
defmodule {{{name}}}Group do
  @name "{{{rawName}}}"
  @group_id "{{{id}}}"

  defmacro name, do: @name
  defmacro group_id, do: @group_id

  {{#environments}}
  defmodule {{{safeName}}}Environment do
    @name "{{{rawName}}}"
    @environment_id "{{{id}}}"

    defmacro name, do: @name
    defmacro environment_id, do: @environment_id
  end

  {{/environments}}

  {{#features}}
  defmodule {{{safeName}}}Feature do
    @name "{{{rawName}}}"
    @feature_id "{{{id}}}"

    defmacro name, do: @name
    defmacro feature_id, do: @feature_id
  end

  {{/features}}
end

{{/groups}}
`,
  php: `<?php
namespace Vexilla\\Types;
/*
  {{{disclaimerText}}}
*/

{{#groups}}
class {{{name}}}Group {
  const NAME = "{{{rawName}}}";
  const GROUP_ID = "{{{id}}}";

  {{#environments}}
  public static function {{{name}}}Environment() {
    return new class() {
      const NAME = "{{{rawName}}}";
      const ENVIRONMENT_ID = "{{{id}}}";
    };
  }
  {{/environments}}


  {{#features}}
  public static function {{{name}}}Feature() {
    return new class() {
      const NAME = "{{{rawName}}}";
      const FEATURE_ID = "{{{id}}}";
    };
  }
  {{/features}}
}
{{/groups}}
`,
  python: `"""
  {{{disclaimerText}}}
"""

from enum import Enum

{{#groups}}

class {{{name}}}Group(str, Enum):
    NAME = "{{{rawName}}}"
    GROUP_ID = "{{{id}}}"

    @staticmethod
    {{#environments}}
    class {{{name}}}Environment(str, Enum):
        NAME = "{{{rawName}}}"
        ENVIRONMENT_ID = "{{{id}}}"

    {{/environments}}
    {{#features}}
    @staticmethod
    class {{{name}}}Feature(str, Enum):
        NAME = "{{{rawName}}}"
        FEATURE_ID = "{{{id}}}"

  {{/features}}
{{/groups}}`,
  kotlin: `/*
  {{{disclaimerText}}}
*/

{{#groups}}

data object {{{name}}}Group {
  const val NAME: String = "{{{rawName}}}"
  const val ID: String = "{{{id}}}"

  enum class Features(val id: String) {
    {{#features}}
    {{{name}}}("{{{id}}}"),
    {{/features}}
  }
  enum class Environments(val id: String) {
    {{#environments}}
    {{{name}}}("{{{id}}}"),
    {{/environments}}
  }
}

{{/groups}}`,
};
