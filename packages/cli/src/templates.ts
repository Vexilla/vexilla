import { Language } from "./types";

export const templates: Record<Language, string> = {
  js: `
/*
  {{{disclaimerText}}}
*/

{{#groups}}
export const {{{groupName}}} = {
  name: "{{{rawGroupName}}}",
  id: "{{{groupId}}}",
  environments: {
    {{#environments}}
    {{{environmentName}}}: "{{{environmentId}}}",
    {{/environments}}
  },
  features: {
    {{#features}}
    {{{featureName}}}: "{{{featureId}}}",
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
export const {{{groupName}}}Group = {
  name: "{{{rawGroupName}}}",
  id: "{{{groupId}}}",
  environments: {
    {{#environments}}
    {{{environmentName}}}: "{{{environmentId}}}",
    {{/environments}}
  },
  features: {
    {{#features}}
    {{{featureName}}}: "{{{featureId}}}",
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
pub mod {{{groupName}}}Group {
    use std::fmt::{ Display, Formatter, Result};
    pub const Name: &str = "{{{rawGroupName}}}";
    pub const Id: &str = "{{{groupId}}}";

    pub enum Environments {
        {{#environments}}
        {{{environmentName}}},
        {{/environments}}
    }

    impl Into<&str> for Environments {
      fn into(self) -> &'static str {
            match self {
                {{#environments}}
                Environments::{{{environmentName}}} => "{{{environmentId}}}",
                {{/environments}}
            }
        }
    }

    pub enum Features {
        {{#features}}
        {{{featureName}}},
        {{/features}}
    }

    impl Into<&str> for Features {
      fn into(self) -> &'static str {
            match self {
                {{#features}}
                Features::{{{featureName}}} => "{{{featureId}}}",
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

type {{{structName}}}Environments struct {
  {{#environments}}
  {{{name}}} func () string
  {{/environments}}
}

type {{{structName}}}Features struct {
  {{#features}}
  {{{name}}} func () string
  {{/features}}
}

type {{{structName}}}Group struct {
  Name func () string
  ID func () string
  Environments func () {{{structName}}}Environments
  Features func () {{{structName}}}Features
}

var {{{name}}}Group = func () {{{structName}}}Group {
  return {{{structName}}}Group {
    Name: func () string { return "{{{name}}}" },
    ID: func () string { return "{{{id}}}" },
    Environments: func () {{{structName}}}Environments {
      return {{{structName}}}Environments {
        {{#environments}}
        {{{name}}}: func () string { return "{{{id}}}" },
        {{/environments}}
      }
    } ,
    Features: func () {{{structName}}}Features {
      return {{{structName}}}Features {
        {{#features}}
        {{{name}}}: func () string { return "{{{id}}}" },
        {{/features}}
      }
    },
  }
}
{{/groups}}
`,
};
