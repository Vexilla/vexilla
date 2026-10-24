//! Rust client for Vexilla's published v1 feature flags.
use std::collections::HashMap;

mod compat;
mod example;
mod hashing;
mod scheduling;
pub mod types;
mod validation;

use crate::hashing::*;
use crate::scheduling::*;
pub use crate::types::InstanceId;
use crate::types::*;

type VexillaResult<T, E = VexillaError> = std::result::Result<T, E>;

/// An independent, validated snapshot of a manifest and its fetched groups.
#[derive(Clone, Debug, Default)]
pub struct VexillaClient {
    environment: &'static str,
    base_url: &'static str,
    instance_id: InstanceId,
    manifest: Manifest,
    flag_groups: HashMap<String, FlagGroup>,
    group_lookup_table: HashMap<String, String>,
    flag_lookup_table: HashMap<String, HashMap<String, String>>,
    environment_lookup_table: HashMap<String, HashMap<String, String>>,
}
impl VexillaClient {
    /// Create a client. `None::<String>` omits the default instance ID.
    pub fn new(
        environment: impl Into<&'static str>,
        base_url: impl Into<&'static str>,
        instance_id: impl Into<InstanceId>,
    ) -> Self {
        Self {
            environment: environment.into(),
            base_url: base_url.into(),
            instance_id: instance_id.into(),
            ..Self::default()
        }
    }
    /// Fetch and validate a manifest without installing it.
    pub fn get_manifest(
        &self,
        fetch: impl FnOnce(&str) -> VexillaResult<String>,
    ) -> VexillaResult<Manifest> {
        let text = fetch(&format!("{}/manifest.json", self.base_url))
            .map_err(|error| VexillaError::Fetch(error.to_string()))?;
        validation::parsed_manifest(&text)
    }
    /// Atomically replace the manifest and remove groups whose identity changed.
    pub fn set_manifest(&mut self, manifest: Manifest) -> VexillaResult<()> {
        validation::manifest(
            &serde_json::to_value(&manifest)
                .map_err(|error| VexillaError::Validation(error.to_string()))?,
        )?;
        let lookup = create_group_lookup_table(&manifest)?;
        self.flag_groups.retain(|id, group| {
            manifest
                .groups
                .iter()
                .any(|entry| &entry.group_id == id && entry.name == group.name)
        });
        let installed = &self.flag_groups;
        self.flag_lookup_table
            .retain(|id, _| installed.contains_key(id));
        self.environment_lookup_table
            .retain(|id, _| installed.contains_key(id));
        self.manifest = manifest;
        self.group_lookup_table = lookup;
        Ok(())
    }
    /// Fetch and install a validated manifest.
    pub fn sync_manifest(
        &mut self,
        fetch: impl FnOnce(&str) -> VexillaResult<String>,
    ) -> VexillaResult<bool> {
        self.set_manifest(self.get_manifest(fetch)?)?;
        Ok(true)
    }
    /// Fetch a listed group without installing it.
    pub fn get_flags(
        &self,
        group: &str,
        fetch: impl FnOnce(&str) -> VexillaResult<String>,
    ) -> VexillaResult<FlagGroup> {
        let id = self
            .group_lookup_table
            .get(group)
            .ok_or(VexillaError::GroupLookupKeyNotFound)?;
        let text = fetch(&format!("{}/{}.json", self.base_url, id))
            .map_err(|error| VexillaError::Fetch(error.to_string()))?;
        let flags = validation::parsed_group(&text)?;
        validation::installed_group(&flags, &self.manifest)?;
        if &flags.group_id != id {
            return Err(VexillaError::Validation(
                "Fetched group differs from requested group".to_owned(),
            ));
        }
        Ok(flags)
    }
    /// Validate and install an owned group, replacing its lookup aliases.
    pub fn set_flags(&mut self, flags: FlagGroup) -> VexillaResult<bool> {
        if self.manifest.version.is_empty() {
            return Err(VexillaError::GroupLookupKeyNotFound);
        }
        validation::installed_group(&flags, &self.manifest)?;
        let features = create_feature_lookup_table(&flags)?;
        let environments = create_environment_lookup_table(&flags)?;
        self.flag_lookup_table
            .insert(flags.group_id.clone(), features);
        self.environment_lookup_table
            .insert(flags.group_id.clone(), environments);
        self.flag_groups.insert(flags.group_id.clone(), flags);
        Ok(true)
    }
    /// Fetch and install a validated group.
    pub fn sync_flags(
        &mut self,
        group: &str,
        fetch: impl FnOnce(&str) -> VexillaResult<String>,
    ) -> VexillaResult<()> {
        self.set_flags(self.get_flags(group, fetch)?)?;
        Ok(())
    }
    /// Evaluate a boolean feature using the configured instance ID when needed.
    pub fn should(&self, group: &str, feature: impl Into<&'static str>) -> VexillaResult<bool> {
        self.should_instance(group, feature.into(), &self.instance_id)
    }
    /// Evaluate with a string instance ID.
    pub fn should_custom(
        &self,
        group: &str,
        feature: impl Into<&'static str>,
        id: impl Into<InstanceId>,
    ) -> VexillaResult<bool> {
        self.should_instance(group, feature.into(), &id.into())
    }
    /// Evaluate with a string instance ID.
    pub fn should_custom_str(
        &self,
        group: &str,
        feature: impl Into<&'static str>,
        id: &str,
    ) -> VexillaResult<bool> {
        self.should_instance(group, feature.into(), &InstanceId::from(id))
    }
    /// Evaluate with an exactly representable integer instance ID.
    pub fn should_custom_int(
        &self,
        group: &str,
        feature: impl Into<&'static str>,
        id: i64,
    ) -> VexillaResult<bool> {
        self.should_instance(group, feature.into(), &InstanceId::Integer(id))
    }
    /// Evaluate with a finite binary64 instance ID.
    pub fn should_custom_float(
        &self,
        group: &str,
        feature: impl Into<&'static str>,
        id: f64,
    ) -> VexillaResult<bool> {
        self.should_instance(group, feature.into(), &InstanceId::Float(id))
    }
    fn should_instance(
        &self,
        group: &str,
        key: &str,
        instance: &InstanceId,
    ) -> VexillaResult<bool> {
        let feature = self.get_feature(group, key)?;
        if matches!(feature, Feature::Value(_)) {
            return Err(VexillaError::InvalidShouldFeatureType(
                feature.feature_type(),
            ));
        }
        let mut text = String::new();
        let mut number = None;
        if !matches!(feature, Feature::Toggle(_)) {
            match instance {
                InstanceId::Text(value) => {
                    text.clone_from(value);
                }
                InstanceId::Float(value) => {
                    text = numeric_text(*value)?;
                    number = Some(*value);
                }
                InstanceId::Integer(value) => {
                    let numeric = *value as f64;
                    if numeric as i128 != i128::from(*value) {
                        return Err(VexillaError::InvalidInstanceId);
                    }
                    text = numeric_text(numeric)?;
                    number = Some(numeric);
                }
                InstanceId::Missing | InstanceId::Invalid => {
                    return Err(VexillaError::InvalidInstanceId);
                }
            }
        }
        if !is_scheduled_feature_active(feature) {
            return Ok(false);
        }
        match feature {
            Feature::Toggle(f) => Ok(f.value),
            Feature::Gradual(f) => Ok(hash_value(&text, f.seed) < f.value),
            Feature::Selective(SelectiveFeature::String { value, .. }) => {
                Ok(matches!(instance, InstanceId::Text(_)) && value.contains(&text))
            }
            Feature::Selective(SelectiveFeature::Number(SelectiveFeatureNumber::Int {
                value,
                ..
            })) => Ok(number.is_some_and(|id| value.iter().any(|v| *v as f64 == id))),
            Feature::Selective(SelectiveFeature::Number(SelectiveFeatureNumber::Float {
                value,
                ..
            })) => Ok(number.is_some_and(|id| value.contains(&id))),
            Feature::Value(_) => Err(VexillaError::InvalidShouldFeatureType("value")),
        }
    }
    /// Read a string value, returning the default outside its schedule.
    pub fn value_str(
        &self,
        group: &str,
        key: impl Into<&'static str>,
        default: &'static str,
    ) -> VexillaResult<String> {
        let feature = self.get_feature(group, key.into())?;
        match feature {
            Feature::Value(ValueFeature::String { value, .. }) => {
                Ok(if is_scheduled_feature_active(feature) {
                    value.clone()
                } else {
                    default.to_owned()
                })
            }
            Feature::Value(f) => Err(VexillaError::InvalidValueStringType(f.value_type())),
            _ => Err(VexillaError::InvalidValueFeatureType(
                feature.feature_type(),
            )),
        }
    }
    /// Read an integer value, returning the default outside its schedule.
    pub fn value_int(
        &self,
        group: &str,
        key: impl Into<&'static str>,
        default: i64,
    ) -> VexillaResult<i64> {
        let feature = self.get_feature(group, key.into())?;
        match feature {
            Feature::Value(ValueFeature::Number(ValueFeatureNumber::Int { value, .. })) => {
                Ok(if is_scheduled_feature_active(feature) {
                    *value
                } else {
                    default
                })
            }
            Feature::Value(f) => Err(VexillaError::InvalidValueI64Type(f.value_type())),
            _ => Err(VexillaError::InvalidValueFeatureType(
                feature.feature_type(),
            )),
        }
    }
    /// Read a float value, returning the default outside its schedule.
    pub fn value_float(
        &self,
        group: &str,
        key: impl Into<&'static str>,
        default: f64,
    ) -> VexillaResult<f64> {
        let feature = self.get_feature(group, key.into())?;
        match feature {
            Feature::Value(ValueFeature::Number(ValueFeatureNumber::Float { value, .. })) => {
                Ok(if is_scheduled_feature_active(feature) {
                    *value
                } else {
                    default
                })
            }
            Feature::Value(f) => Err(VexillaError::InvalidValueF64Type(f.value_type())),
            _ => Err(VexillaError::InvalidValueFeatureType(
                feature.feature_type(),
            )),
        }
    }
    fn get_feature(&self, group: &str, feature: &str) -> VexillaResult<&Feature> {
        let id = self
            .group_lookup_table
            .get(group)
            .ok_or(VexillaError::GroupLookupKeyNotFound)?;
        let group = self
            .flag_groups
            .get(id)
            .ok_or(VexillaError::FlagGroupKeyNotFound)?;
        let env = self
            .environment_lookup_table
            .get(id)
            .and_then(|lookup| lookup.get(self.environment))
            .ok_or(VexillaError::EnvironmentLookupKeyNotFound)?;
        let fid = self
            .flag_lookup_table
            .get(id)
            .and_then(|lookup| lookup.get(feature))
            .ok_or(VexillaError::FlagLookupKeyNotFound)?;
        group
            .environments
            .get(env)
            .and_then(|env| env.features.get(fid))
            .ok_or(VexillaError::EnvironmentFeatureKeyNotFound)
    }
}
fn create_group_lookup_table(manifest: &Manifest) -> VexillaResult<HashMap<String, String>> {
    let mut lookup = HashMap::new();
    for group in &manifest.groups {
        for key in [
            group.group_id.clone(),
            group.name.clone(),
            compat::normalize(&group.name)?,
        ] {
            lookup.insert(key, group.group_id.clone());
        }
    }
    Ok(lookup)
}
fn create_feature_lookup_table(group: &FlagGroup) -> VexillaResult<HashMap<String, String>> {
    let mut lookup = HashMap::new();
    for (id, feature) in &group.features {
        let (_, name) = feature.identity();
        for key in [id.clone(), name.to_owned(), compat::normalize(name)?] {
            lookup.insert(key, id.clone());
        }
    }
    Ok(lookup)
}
fn create_environment_lookup_table(group: &FlagGroup) -> VexillaResult<HashMap<String, String>> {
    let mut lookup = HashMap::new();
    for (id, env) in &group.environments {
        for key in [id.clone(), env.name.clone(), compat::normalize(&env.name)?] {
            lookup.insert(key, id.clone());
        }
    }
    Ok(lookup)
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

#[cfg(test)]
mod contract;
