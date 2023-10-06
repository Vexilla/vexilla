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
    use std::fmt::{ Display, Formatter, Result};
    pub const Name: &str = "{{{rawName}}}";
    pub const Id: &str = "{{{id}}}";

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
};

`
namespace Vexilla.Client {

  class ToggleGroup {
    public static string Name = "Toggle";
    public static string EnvironmentId = "khgasdkfhgaksdhgf";


    public static class Environments {

    }

    public static class Features {

    }

  }
}

`;
