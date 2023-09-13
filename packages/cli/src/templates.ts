import { Language } from "./types";

export const templates: Record<Language, string> = {
  js: `
/*
  {{{disclaimerText}}}
*/

{{#groups}}
export const {{{groupName}}} = {
  name: {{{rawGroupName}}},
  id: {{{groupId}}},
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
export const {{{groupName}}} = {
  name: {{{rawGroupName}}},
  id: {{{groupId}}},
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
pub mod {{{groupName}}} {
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
};
