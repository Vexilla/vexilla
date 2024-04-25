//! This is the Rust client library for Vexilla, a static file-based VCS-native feature flag system.
//!
//! If you would like to know more about Vexilla head on over to our website. [https://vexilla.dev](https://vexilla.dev)
//!

use convert_case::{Case, Casing};
use serde_json::Result;
use std::collections::HashMap;

mod example;
mod hashing;
mod scheduling;
mod types;

use crate::hashing::*;
use crate::scheduling::*;
use crate::types::*;

type VexillaResult<T, E = VexillaError> = std::result::Result<T, E>;
type Callback = fn(url: &str) -> VexillaResult<String>;

/// VexillaClient is the core struct of this SDK. Most interaction with Vexilla and your feature flags will be through this struct.
#[derive(Clone, Debug, Default)]
pub struct VexillaClient {
    environment: &'static str,
    base_url: &'static str,
    instance_id: &'static str,

    show_logs: bool,

    manifest: Manifest,
    flag_groups: HashMap<String, FlagGroup>,

    group_lookup_table: HashMap<String, String>,
    flag_lookup_table: HashMap<String, HashMap<String, String>>,
    environment_lookup_table: HashMap<String, HashMap<String, String>>,
}

impl VexillaClient {
    /// Create a new client for consuming feature flags.
    pub fn new(
        environment: impl Into<&'static str>,
        base_url: impl Into<&'static str>,
        instance_id: impl Into<&'static str>,
    ) -> VexillaClient {
        VexillaClient {
            manifest: Manifest::default(),
            show_logs: false,
            environment: environment.into(),
            base_url: base_url.into(),
            instance_id: instance_id.into(),
            flag_groups: HashMap::new(),
            group_lookup_table: HashMap::new(),
            flag_lookup_table: HashMap::new(),
            environment_lookup_table: HashMap::new(),
        }
    }

    /// Fetches the manifest file for facilitating name->id lookups. Does not set the value on the client. You would need to call `set_manifest` after. Alternatively, you can use `sync_manifest` to do both steps with less code.
    pub fn get_manifest(&self, fetch: Callback) -> VexillaResult<Manifest> {
        let url = format!("{}/manifest.json", self.base_url);
        let response_text = fetch(&url);
        let manifest: Manifest =
            serde_json::from_str(response_text?.as_ref()).map_err(|_| VexillaError::Unknown)?;

        Ok(manifest)
    }

    /// Sets a fetched manifest within the VexillaClient instance. It can also be useful for mocking flags for testing.
    pub fn set_manifest(&mut self, manifest: Manifest) {
        self.group_lookup_table = create_group_lookup_table(manifest);
    }

    /// Fetches and sets the manifest within the client to facilitate name->Id lookups.
    pub fn sync_manifest(&mut self, fetch: Callback) -> VexillaResult<bool> {
        let manifest = self.get_manifest(fetch)?;
        let lookup_table = create_group_lookup_table(manifest.clone());
        self.manifest = manifest;
        self.group_lookup_table = lookup_table;
        Ok(true)
    }

    /// Fetches the flags for a specific flag group. Can use the ID or the name of the group for the lookup.
    pub fn get_flags(&self, group_name_or_id: &str, fetch: Callback) -> VexillaResult<FlagGroup> {
        let coerced_group_id = &self
            .group_lookup_table
            .get(group_name_or_id)
            .ok_or(VexillaError::GroupLookupKeyNotFound)?;
        let url = format!("{}/{}.json", self.base_url, coerced_group_id);
        let response_text = fetch(&url)?;

        let flags: Result<FlagGroup> = serde_json::from_str(response_text.as_str());

        if let Ok(..) = flags {
            Ok(flags.unwrap())
        } else {
            VexillaResult::Err(VexillaError::Unknown)
        }
    }

    /// Sets a fetched flag group within the Client instance.
    pub fn set_flags(&mut self, flags: FlagGroup) -> VexillaResult<bool> {
        let coerced_group_name_or_id = &self
            .group_lookup_table
            .get(&flags.group_id)
            .ok_or("group not found")
            .map_err(|_| VexillaError::Unknown)?;
        self.flag_groups
            .insert(coerced_group_name_or_id.to_string(), flags.clone());

        let group_flag_table = create_feature_lookup_table(flags.clone());
        self.flag_lookup_table
            .insert(coerced_group_name_or_id.to_string(), group_flag_table);

        let environment_table = create_environment_lookup_table(flags);
        self.environment_lookup_table
            .insert(coerced_group_name_or_id.to_string(), environment_table);
        Ok(true)
    }

    /// Fetches and sets the flag group within the client to facilitate name->Id lookups.
    pub fn sync_flags(
        &mut self,
        group_name_or_id: &str,
        fetch: Callback,
    ) -> VexillaResult<(), VexillaError> {
        let cloned_self = self.clone();
        let coerced_group_id = cloned_self
            .group_lookup_table
            .get(group_name_or_id)
            .ok_or(VexillaError::GroupLookupKeyNotFound)?;
        let flag_group = self.get_flags(coerced_group_id.as_str(), fetch)?;
        let _ = self.set_flags(flag_group)?;
        Ok(())
    }

    /// Checks if a toggle, gradual, or selective flag should be enabled. Other methods exist for other flag types, such as value.
    pub fn should(
        &self,
        group_name_or_id: &'static str,
        feature_name_or_id: impl Into<&'static str>,
    ) -> VexillaResult<bool> {
        let feature = self.get_feature(group_name_or_id, feature_name_or_id.into())?;

        let is_within_schedule = is_scheduled_feature_active(feature.to_owned());

        match (feature.clone(), is_within_schedule) {
            (Feature::Toggle(feature), true) => Ok(feature.value),
            (Feature::Gradual(feature), true) => {
                Ok(self.hash_instance_id(feature.seed) < feature.value)
            }
            (Feature::Selective(feature), true) => match feature {
                SelectiveFeature::String { value, .. } => {
                    Ok(value.contains(&self.instance_id.to_owned()))
                }
                SelectiveFeature::Number(feature) => match feature {
                    SelectiveFeatureNumber::Float { value, .. } => Ok(value.contains(
                        &self
                            .instance_id
                            .to_owned()
                            .parse()
                            .map_err(|_| VexillaError::Unknown)?,
                    )),
                    SelectiveFeatureNumber::Int { value, .. } => Ok(value.contains(
                        &self
                            .instance_id
                            .to_owned()
                            .parse()
                            .map_err(|_| VexillaError::Unknown)?,
                    )),
                },
                _ => Err(VexillaError::InvalidShouldFeatureType(feature.value_type())),
            },

            (_, false) => Ok(false),

            (_, _) => Err(VexillaError::InvalidShouldFeatureType(
                feature.feature_type(),
            )),
        }
    }

    /// Checks if a toggle, gradual, or selective flag should be enabled. Uses a custom instance ID rather than the one set in the Client. Other methods exist for other flag types, such as value.
    pub fn should_custom_str(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: impl Into<&'static str>,
        custom_id: &str,
    ) -> VexillaResult<bool> {
        let feature = self.get_feature(group_name_or_id, feature_name_or_id.into())?;

        let is_within_schedule = is_scheduled_feature_active(feature.to_owned());

        match (feature.clone(), is_within_schedule) {
            (Feature::Toggle(feature), true) => Ok(feature.value),
            (Feature::Gradual(feature), true) => {
                Ok(hash_value(custom_id, feature.seed) < feature.value)
            }
            (Feature::Selective(feature), true) => match feature {
                SelectiveFeature::String { value, .. } => Ok(value.contains(&custom_id.to_owned())),
                _ => Err(VexillaError::InvalidShouldCustomStr(feature.value_type())),
            },

            (_, false) => Ok(false),

            (_, _) => Err(VexillaError::InvalidShouldFeatureType(
                feature.feature_type(),
            )),
        }
    }

    /// Checks if a toggle, gradual, or selective flag should be enabled. Uses a custom instance ID rather than the one set in the Client. Other methods exist for other flag types, such as value.
    pub fn should_custom_int(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: impl Into<&'static str>,
        custom_id: i64,
    ) -> VexillaResult<bool> {
        let feature = self.get_feature(group_name_or_id, feature_name_or_id.into())?;

        let is_within_schedule = is_scheduled_feature_active(feature.to_owned());

        match (feature.clone(), is_within_schedule) {
            (Feature::Toggle(feature), true) => Ok(feature.value),
            (Feature::Gradual(_feature), true) => Err(VexillaError::Unknown),
            (Feature::Selective(feature), true) => match feature {
                SelectiveFeature::Number(SelectiveFeatureNumber::Int { value, .. }) => {
                    Ok(value.contains(&custom_id))
                }
                _ => Err(VexillaError::InvalidShouldCustomInt(feature.value_type())),
            },

            (_, false) => Ok(false),

            (_, _) => Err(VexillaError::InvalidShouldFeatureType(
                feature.feature_type(),
            )),
        }
    }

    /// Checks if a toggle, gradual, or selective flag should be enabled. Uses a custom instance ID rather than the one set in the Client. Other methods exist for other flag types, such as value.
    pub fn should_custom_float(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: impl Into<&'static str>,
        custom_id: f64,
    ) -> VexillaResult<bool> {
        let feature = self.get_feature(group_name_or_id, feature_name_or_id.into())?;

        let is_within_schedule = is_scheduled_feature_active(feature.to_owned());

        match (feature.clone(), is_within_schedule) {
            (Feature::Toggle(feature), true) => Ok(feature.value),
            (Feature::Gradual(_feature), true) => Err(VexillaError::Unknown),
            (Feature::Selective(feature), true) => match feature {
                SelectiveFeature::Number(SelectiveFeatureNumber::Float { value, .. }) => {
                    Ok(value.contains(&custom_id))
                }
                _ => Err(VexillaError::InvalidShouldCustomInt(feature.value_type())),
            },

            (_, false) => Ok(false),

            (_, _) => Err(VexillaError::InvalidShouldFeatureType(
                feature.feature_type(),
            )),
        }
    }

    /// Gets an environment specific string value and falls back to a default if the feature is outside of its schedule.
    pub fn value_str(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: impl Into<&'static str>,
        default: &'static str,
    ) -> VexillaResult<String> {
        let feature = self.get_feature(group_name_or_id, feature_name_or_id.into())?;
        let is_within_schedule = is_scheduled_feature_active(feature.to_owned());

        match (feature.clone(), is_within_schedule) {
            (Feature::Value(feature), true) => match feature {
                ValueFeature::String { value, .. } => Ok(value),
                _ => Err(VexillaError::InvalidValueStringType(feature.value_type())),
            },

            (_, false) => Ok(default.to_string()),

            (_, _) => Err(VexillaError::InvalidValueFeatureType(
                feature.feature_type(),
            )),
        }
    }

    /// Gets an environment specific int value and falls back to a default if the feature is outside of its schedule.
    pub fn value_int(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: impl Into<&'static str>,
        default: i64,
    ) -> VexillaResult<i64> {
        let feature = self.get_feature(group_name_or_id, feature_name_or_id.into())?;

        let is_within_schedule = is_scheduled_feature_active(feature.to_owned());

        match (feature.clone(), is_within_schedule) {
            (Feature::Value(feature), true) => match feature {
                ValueFeature::Number(ValueFeatureNumber::Int { value, .. }) => Ok(value.to_owned()),
                _ => Err(VexillaError::InvalidValueI64Type(feature.value_type())),
            },

            (_, false) => Ok(default),

            (_, _) => Err(VexillaError::InvalidValueFeatureType(
                feature.feature_type(),
            )),
        }
    }

    /// Gets an environment specific float value and falls back to a default if the feature is outside of its schedule.
    pub fn value_float(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: impl Into<&'static str>,
        default: f64,
    ) -> VexillaResult<f64> {
        let feature = self.get_feature(group_name_or_id, feature_name_or_id.into())?;

        let is_within_schedule = is_scheduled_feature_active(feature.to_owned());

        match (feature.clone(), is_within_schedule) {
            (Feature::Value(feature), true) => match feature {
                ValueFeature::Number(ValueFeatureNumber::Float { value, .. }) => {
                    Ok(value.to_owned())
                }
                _ => Err(VexillaError::InvalidValueF64Type(feature.value_type())),
            },

            (_, false) => Ok(default),

            (_, _) => Err(VexillaError::InvalidValueFeatureType(
                feature.feature_type(),
            )),
        }
    }

    fn hash_instance_id(&self, seed: f64) -> f64 {
        hash_value(self.instance_id, seed)
    }

    fn get_feature(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: impl Into<&'static str>,
    ) -> VexillaResult<Feature> {
        let ids = self.get_real_ids(group_name_or_id, feature_name_or_id.into())?;

        let group = &self
            .flag_groups
            .get(&ids.real_group_id)
            .ok_or(VexillaError::FlagGroupKeyNotFound)?;

        let environment = group
            .environments
            .get(&ids.real_environment_id)
            .ok_or(VexillaError::EnvironmentLookupKeyNotFound)?;

        let feature = environment
            .features
            .get(&ids.real_feature_id)
            .ok_or(VexillaError::EnvironmentFeatureKeyNotFound)?;

        Ok(feature.clone())
    }

    fn get_real_ids(
        &self,
        group_name_or_id: &str,
        feature_name_or_id: &str,
    ) -> VexillaResult<RealIds> {
        let real_group_id = self
            .group_lookup_table
            .get(group_name_or_id)
            .ok_or(VexillaError::GroupLookupKeyNotFound)?
            .to_string();

        let real_feature_id = self
            .flag_lookup_table
            .get(&real_group_id)
            .ok_or(VexillaError::GroupLookupKeyNotFound)?
            .get(feature_name_or_id)
            .ok_or(VexillaError::FlagLookupKeyNotFound)?
            .to_string();

        let real_environment_id = self
            .environment_lookup_table
            .get(&real_group_id)
            .ok_or(VexillaError::GroupLookupKeyNotFound)?
            .get(self.environment)
            .ok_or(VexillaError::FlagLookupKeyNotFound)?
            .to_string();

        Ok(RealIds {
            real_group_id,
            real_feature_id,
            real_environment_id,
        })
    }
}

fn create_group_lookup_table(manifest: Manifest) -> HashMap<String, String> {
    let mut new_lookup_table: HashMap<String, String> = HashMap::new();

    manifest.groups.iter().for_each(|group| {
        new_lookup_table.insert(group.group_id.clone(), group.group_id.clone());
        new_lookup_table.insert(group.name.clone(), group.group_id.clone());
        new_lookup_table.insert(group.group_id.to_case(Case::Kebab), group.group_id.clone());
    });

    new_lookup_table
}

fn create_feature_lookup_table(flag_group: FlagGroup) -> HashMap<String, String> {
    let mut new_lookup_table: HashMap<String, String> = HashMap::new();

    flag_group
        .features
        .iter()
        .for_each(|(feature_id, feature)| {
            new_lookup_table.insert(feature_id.clone(), feature_id.clone());
            new_lookup_table.insert(feature.name.clone(), feature_id.clone());
            new_lookup_table.insert(feature.name.to_case(Case::Kebab), feature_id.clone());
        });

    new_lookup_table
}

fn create_environment_lookup_table(flag_group: FlagGroup) -> HashMap<String, String> {
    let mut new_lookup_table: HashMap<String, String> = HashMap::new();

    flag_group
        .environments
        .iter()
        .for_each(|(environment_id, environment)| {
            new_lookup_table.insert(environment_id.clone(), environment_id.clone());
            new_lookup_table.insert(environment.name.clone(), environment_id.clone());
            new_lookup_table.insert(
                environment.name.to_case(Case::Kebab),
                environment_id.clone(),
            );
        });

    new_lookup_table
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn end_to_end() {
        let mut client = VexillaClient::new(
            "dev",
            "http://localhost:3000",
            "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a",
        );

        /*
            Manifest
        */

        let manifest = client
            .get_manifest(|url| Ok(reqwest::blocking::get(url).unwrap().text().unwrap()))
            .unwrap();

        assert!(!manifest.version.is_empty());

        client
            .sync_manifest(|url| Ok(reqwest::blocking::get(url).unwrap().text().unwrap()))
            .unwrap();

        /*
            Get Flags
        */

        let flags = client
            .get_flags("Gradual", |url| {
                Ok(reqwest::blocking::get(url).unwrap().text().unwrap())
            })
            .unwrap();

        assert_eq!(flags.name, "Gradual");

        /*
            Gradual
        */

        client
            .sync_flags("Gradual", |url| {
                Ok(reqwest::blocking::get(url).unwrap().text().unwrap())
            })
            .unwrap();

        let working_gradual_by_id = client.should("Gradual", "oIVHzosp0ao3HN0fmFwwr").unwrap();
        assert!(working_gradual_by_id);

        let working_gradual_by_name = client.should("Gradual", "testingWorkingGradual").unwrap();
        assert!(working_gradual_by_name);

        let non_working_gradual_by_id = client.should("Gradual", "-T2se1u9jyj1HNkbJ9Cdr").unwrap();
        assert!(!non_working_gradual_by_id);

        let non_working_gradual_by_name = client
            .should("Gradual", "testingNonWorkingGradual")
            .unwrap();
        assert!(!non_working_gradual_by_name);

        /*
           Scheduled
        */

        client
            .sync_flags("Scheduled", |url| {
                Ok(reqwest::blocking::get(url).unwrap().text().unwrap())
            })
            .unwrap();

        /*
           Scheduled (Global timeless)
        */

        let before_global_scheduled = client.should("Scheduled", "beforeGlobal").unwrap();
        assert!(!before_global_scheduled);

        let during_global_scheduled = client.should("Scheduled", "duringGlobal").unwrap();
        assert!(during_global_scheduled);

        let after_global_scheduled = client.should("Scheduled", "afterGlobal").unwrap();
        assert!(!after_global_scheduled);

        /*
           Scheduled (Global Start/End)
        */

        let before_global_startend_scheduled =
            client.should("Scheduled", "beforeGlobalStartEnd").unwrap();
        assert!(!before_global_startend_scheduled);

        let during_global_startend_scheduled =
            client.should("Scheduled", "duringGlobalStartEnd").unwrap();
        assert!(during_global_startend_scheduled);

        let after_global_startend_scheduled =
            client.should("Scheduled", "afterGlobalStartEnd").unwrap();
        assert!(!after_global_startend_scheduled);

        /*
           Scheduled (Global Daily)
        */

        let before_global_daily_scheduled =
            client.should("Scheduled", "beforeGlobalDaily").unwrap();
        assert!(!before_global_daily_scheduled);

        let during_global_daily_scheduled =
            client.should("Scheduled", "duringGlobalDaily").unwrap();
        assert!(during_global_daily_scheduled);

        let after_global_daily_scheduled = client.should("Scheduled", "afterGlobalDaily").unwrap();
        assert!(!after_global_daily_scheduled);

        /*
           Selective
        */

        client
            .sync_flags("Selective", |url| {
                Ok(reqwest::blocking::get(url).unwrap().text().unwrap())
            })
            .unwrap();

        let selective_string_default = client.should("Selective", "String").unwrap();
        assert!(selective_string_default);

        let selective_string_custom = client
            .should_custom_str("Selective", "String", "shouldBeInList")
            .unwrap();
        assert!(selective_string_custom);

        let selective_string_custom_fail = client
            .should_custom_str("Selective", "String", "shouldNotBeInList")
            .unwrap();
        assert!(!selective_string_custom_fail);

        let selective_number_custom = client.should_custom_int("Selective", "Number", 42).unwrap();
        assert!(selective_number_custom);

        let selective_number_custom_fail =
            client.should_custom_int("Selective", "Number", 43).unwrap();
        assert!(!selective_number_custom_fail);

        /*
           Value
        */

        client
            .sync_flags("Value", |url| {
                Ok(reqwest::blocking::get(url).unwrap().text().unwrap())
            })
            .unwrap();

        let value_str = client.value_str("Value", "String", "bar").unwrap();
        assert!(value_str == "foo");

        let value_int = client
            .value_int(
                example::ValueGroup::NAME,
                example::ValueGroup::Features::Integer,
                21,
            )
            .unwrap();
        assert!(value_int == 42);

        let value_float = client.value_float("Value", "Float", 21.21).unwrap();
        assert!(value_float == 42.42);
    }
}
