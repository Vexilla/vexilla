use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::convert::TryFrom;
use strum_macros::EnumString;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VexillaError {
    #[error("Invalid v1 data: {0}")]
    Validation(String),
    #[error("Fetch failed: {0}")]
    Fetch(String),
    #[error("A finite, exactly representable numeric or string instance ID is required")]
    InvalidInstanceId,

    #[error("should only supports toggle, gradual, and selective feature types. tried type: {0}")]
    InvalidShouldFeatureType(&'static str),

    #[error("should selective features use the instance_id which is a &str. tried type: {0}. consider using should_custom instead.")]
    InvalidShouldFeatureValueType(&'static str),

    #[error("should_custom gradual features only allow &str. tried type: {0}.")]
    InvalidShouldCustomGradualFeatureValueType(&'static str),

    #[error("should_custom_str only allows &str for the custom_id. the type passed in does not match the value type of the feature. tried type: {0}")]
    InvalidShouldCustomStr(&'static str),

    #[error("should_custom_int only allows i64  for the custom_id. the type passed in does not match the value type of the feature. tried type: {0}")]
    InvalidShouldCustomInt(&'static str),

    #[error("should_custom_float only allows f64 for the custom_id. the type passed in does not match the value type of the feature. tried type: {0}")]
    InvalidShouldCustomFloat(&'static str),

    #[error("value only supports the value feature type. tried type: {0}")]
    InvalidValueFeatureType(&'static str),

    #[error("value_str only supports a string value. tried type: {0}")]
    InvalidValueStringType(&'static str),

    #[error("value_i64 only supports an i64 value. tried type: {0}")]
    InvalidValueI64Type(&'static str),

    #[error("value_f64 only supports an f64 value. tried type: {0}")]
    InvalidValueF64Type(&'static str),

    #[error("error parsing schedule: {0}")]
    InvalidSchedule(&'static str),

    #[error("could not get key on group_lookup_table")]
    GroupLookupKeyNotFound,

    #[error("could not get key on group_lookup_table")]
    FlagLookupKeyNotFound,

    #[error("could not get key on group_lookup_table")]
    EnvironmentLookupKeyNotFound,

    #[error("could not get key on group_lookup_table")]
    FlagGroupKeyNotFound,

    #[error("could not get key on group_lookup_table")]
    EnvironmentFeatureKeyNotFound,

    #[error("unknown vexilla error")]
    Unknown,
}

#[derive(Clone, Debug, EnumString, Deserialize, Serialize)]
#[serde(tag = "featureType")]
#[strum(serialize_all = "camelCase")]
pub enum Feature {
    #[serde(rename = "gradual")]
    Gradual(GradualFeature),

    #[serde(rename = "selective")]
    Selective(SelectiveFeature),

    #[serde(rename = "toggle")]
    Toggle(ToggleFeature),

    #[serde(rename = "value")]
    Value(ValueFeature),
}

impl Default for Feature {
    fn default() -> Self {
        Feature::Toggle(ToggleFeature::default())
    }
}

impl Feature {
    pub fn identity(&self) -> (&str, &str) {
        match self {
            Self::Toggle(f) => (&f.feature_id, &f.name),
            Self::Gradual(f) => (&f.feature_id, &f.name),
            Self::Selective(SelectiveFeature::String {
                feature_id, name, ..
            })
            | Self::Selective(SelectiveFeature::Number(SelectiveFeatureNumber::Int {
                feature_id,
                name,
                ..
            }))
            | Self::Selective(SelectiveFeature::Number(SelectiveFeatureNumber::Float {
                feature_id,
                name,
                ..
            }))
            | Self::Value(ValueFeature::String {
                feature_id, name, ..
            })
            | Self::Value(ValueFeature::Number(ValueFeatureNumber::Int {
                feature_id, name, ..
            }))
            | Self::Value(ValueFeature::Number(ValueFeatureNumber::Float {
                feature_id,
                name,
                ..
            })) => (feature_id, name),
        }
    }
    pub fn feature_type(&self) -> &'static str {
        match &self {
            Feature::Toggle(_feature) => "toggle",
            Feature::Gradual(_feature) => "gradual",
            Feature::Selective(_feature) => "selective",
            Feature::Value(_feature) => "value",
        }
    }
}

#[derive(Clone, Debug, EnumString, Deserialize, Serialize, Default)]
#[strum(serialize_all = "camelCase")]
pub enum ScheduleType {
    #[default]
    #[serde(rename = "")]
    Empty,
    #[serde(rename = "global")]
    Global,
    #[serde(rename = "environment")]
    Environment,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GroupFeature {
    pub name: String,
    pub feature_id: String,
    pub feature_type: String,
    pub schedule_type: ScheduleType,
    pub schedule: VexillaSchedule,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFeature {
    pub name: String,
    pub feature_id: String,
    pub schedule_type: ScheduleType,
    pub schedule: VexillaSchedule,
    pub value: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GradualFeature {
    pub name: String,
    pub feature_id: String,
    pub schedule_type: ScheduleType,
    pub schedule: VexillaSchedule,
    pub value: f64,
    #[serde(deserialize_with = "deserialize_seed")]
    pub seed: f64,
}

fn deserialize_seed<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<f64, D::Error> {
    let seed = f64::deserialize(deserializer)?;
    if !seed.is_finite() || seed <= 0.0 || seed > 1.0 {
        return Err(serde::de::Error::custom(
            "seed must be a finite number greater than 0 and less than or equal to 1",
        ));
    }
    Ok(seed)
}

#[derive(Clone, Debug, EnumString, Deserialize, Serialize)]
#[serde(tag = "valueType")]
#[strum(serialize_all = "camelCase")]
#[serde(rename_all = "camelCase")]
pub enum ValueFeature {
    #[serde(rename_all = "camelCase")]
    String {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
        value: String,
    },
    #[serde(rename_all = "camelCase")]
    Number(ValueFeatureNumber),
}

impl Default for ValueFeature {
    fn default() -> Self {
        ValueFeature::String {
            name: "".to_string(),
            feature_id: "".to_string(),
            schedule_type: ScheduleType::default(),
            schedule: VexillaSchedule::default(),
            value: "".to_string(),
        }
    }
}

impl ValueFeature {
    pub fn value_type(&self) -> &'static str {
        match &self {
            ValueFeature::String { .. } => "string",

            ValueFeature::Number(feature) => match feature {
                ValueFeatureNumber::Int { .. } => "i64",
                ValueFeatureNumber::Float { .. } => "f64",
            },
        }
    }
}

#[derive(Clone, Debug, EnumString, Deserialize, Serialize)]
#[serde(tag = "numberType")]
#[strum(serialize_all = "camelCase")]
#[serde(rename_all = "camelCase")]
pub enum ValueFeatureNumber {
    #[serde(rename_all = "camelCase")]
    Int {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
        #[serde(deserialize_with = "deserialize_integer")]
        value: i64,
    },

    #[serde(rename_all = "camelCase")]
    Float {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
        value: f64,
    },
}

impl Default for ValueFeatureNumber {
    fn default() -> Self {
        ValueFeatureNumber::Int {
            name: "".to_string(),
            feature_id: "".to_string(),
            schedule_type: ScheduleType::Empty,
            schedule: VexillaSchedule::default(),
            value: 0,
        }
    }
}

#[derive(Clone, Debug, EnumString, Deserialize, Serialize)]
#[serde(tag = "numberType")]
#[strum(serialize_all = "camelCase")]
#[serde(rename_all = "camelCase")]
pub enum SelectiveFeatureNumber {
    #[serde(rename_all = "camelCase")]
    Int {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
        #[serde(deserialize_with = "deserialize_integers")]
        value: Vec<i64>,
    },

    #[serde(rename_all = "camelCase")]
    Float {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
        value: Vec<f64>,
    },
}

impl Default for SelectiveFeatureNumber {
    fn default() -> Self {
        SelectiveFeatureNumber::Int {
            name: "".to_string(),
            feature_id: "".to_string(),
            schedule_type: ScheduleType::Empty,
            schedule: VexillaSchedule::default(),
            value: vec![],
        }
    }
}

#[derive(Clone, Debug, EnumString, Deserialize, Serialize)]
#[serde(tag = "valueType")]
#[serde(rename_all = "camelCase")]
#[strum(serialize_all = "camelCase")]
pub enum SelectiveFeature {
    #[serde(rename_all = "camelCase")]
    String {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
        value: Vec<String>,
    },
    Number(SelectiveFeatureNumber),
}

impl Default for SelectiveFeature {
    fn default() -> Self {
        SelectiveFeature::String {
            value: vec![],
            name: "".to_string(),
            feature_id: "".to_string(),
            schedule_type: ScheduleType::Empty,
            schedule: VexillaSchedule::default(),
        }
    }
}

impl SelectiveFeature {
    pub fn value_type(&self) -> &'static str {
        match &self {
            SelectiveFeature::String { .. } => "string",

            SelectiveFeature::Number(feature) => match feature {
                SelectiveFeatureNumber::Int { .. } => "i64",
                SelectiveFeatureNumber::Float { .. } => "f64",
            },
        }
    }
}

#[derive(
    Clone, Copy, Debug, EnumString, Deserialize, Serialize, Default, strum_macros::Display,
)]
#[strum(serialize_all = "camelCase")]
pub enum ScheduleTimeType {
    #[default]
    #[serde(rename = "none")]
    None,
    #[serde(rename = "start/end")]
    StartEnd,
    #[serde(rename = "daily")]
    Daily,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VexillaSchedule {
    #[serde(deserialize_with = "deserialize_integer")]
    pub start: i64,
    #[serde(deserialize_with = "deserialize_integer")]
    pub end: i64,
    pub timezone: String, // TODO: default to UTC when needed
    pub time_type: ScheduleTimeType,
    #[serde(deserialize_with = "deserialize_integer")]
    pub start_time: i64,
    #[serde(deserialize_with = "deserialize_integer")]
    pub end_time: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ManifestGroup {
    pub name: String,
    pub group_id: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PublishedGroupMeta {
    pub version: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DefaultFeatureValues {
    pub toggle: ToggleFeature,
    pub gradual: GradualFeature,
    pub selective: SelectiveFeature,
    pub value: ValueFeature,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PublishedEnvironment {
    pub name: String,
    pub environment_id: String,
    pub features: HashMap<String, Feature>,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase", try_from = "serde_json::Value")]
pub struct Manifest {
    pub version: String,
    pub groups: Vec<ManifestGroup>,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase", try_from = "serde_json::Value")]
pub struct FlagGroup {
    pub name: String,
    pub group_id: String,
    pub environments: HashMap<String, PublishedEnvironment>,
    pub features: HashMap<String, Feature>,
    pub meta: PublishedGroupMeta,
}

#[derive(Clone, Debug, Deserialize, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RealIds {
    pub real_group_id: String,
    pub real_feature_id: String,
    pub real_environment_id: String,
}

fn deserialize_integer<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<i64, D::Error> {
    let value = f64::deserialize(deserializer)?;
    if !value.is_finite() || value.fract() != 0.0 || value.abs() > 9007199254740991.0 {
        return Err(serde::de::Error::custom(
            "a mathematical integer in the safe range is required",
        ));
    }
    Ok(value as i64)
}
fn deserialize_integers<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Vec<i64>, D::Error> {
    let values = Vec::<f64>::deserialize(deserializer)?;
    values
        .into_iter()
        .map(|value| {
            if !value.is_finite() || value.fract() != 0.0 || value.abs() > 9007199254740991.0 {
                Err(serde::de::Error::custom(
                    "a mathematical integer in the safe range is required",
                ))
            } else {
                Ok(value as i64)
            }
        })
        .collect()
}

/// Supported instance representations shared by default and per-call IDs.
#[derive(Clone, Debug, Default)]
pub enum InstanceId {
    #[default]
    Missing,
    Text(String),
    Integer(i64),
    Float(f64),
    Invalid,
}
impl From<&str> for InstanceId {
    fn from(value: &str) -> Self {
        Self::Text(value.to_owned())
    }
}
impl From<String> for InstanceId {
    fn from(value: String) -> Self {
        Self::Text(value)
    }
}
impl From<i64> for InstanceId {
    fn from(value: i64) -> Self {
        Self::Integer(value)
    }
}
impl From<f64> for InstanceId {
    fn from(value: f64) -> Self {
        Self::Float(value)
    }
}
impl From<Option<String>> for InstanceId {
    fn from(value: Option<String>) -> Self {
        value.map_or(Self::Missing, Self::Text)
    }
}
impl From<bool> for InstanceId {
    fn from(_: bool) -> Self {
        Self::Invalid
    }
}

// Capture the original object before native decoding can discard compatible
// properties needed by identity/subtype validation.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestWire {
    version: String,
    groups: Vec<ManifestGroup>,
}
impl TryFrom<serde_json::Value> for Manifest {
    type Error = VexillaError;
    fn try_from(value: serde_json::Value) -> Result<Self, Self::Error> {
        crate::validation::manifest(&value)?;
        let wire: ManifestWire =
            serde_json::from_value(value).map_err(|e| VexillaError::Validation(e.to_string()))?;
        Ok(Self {
            version: wire.version,
            groups: wire.groups,
        })
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FlagGroupWire {
    name: String,
    group_id: String,
    environments: HashMap<String, PublishedEnvironment>,
    features: HashMap<String, Feature>,
    meta: PublishedGroupMeta,
}
impl TryFrom<serde_json::Value> for FlagGroup {
    type Error = VexillaError;
    fn try_from(value: serde_json::Value) -> Result<Self, Self::Error> {
        crate::validation::group(&value)?;
        let wire: FlagGroupWire =
            serde_json::from_value(value).map_err(|e| VexillaError::Validation(e.to_string()))?;
        Ok(Self {
            name: wire.name,
            group_id: wire.group_id,
            environments: wire.environments,
            features: wire.features,
            meta: wire.meta,
        })
    }
}
