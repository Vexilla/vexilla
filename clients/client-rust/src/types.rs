use serde::Deserialize;
use std::collections::HashMap;
use strum_macros::EnumString;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VexillaError {
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

#[derive(Clone, Debug, EnumString, Deserialize)]
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
    pub fn feature_type(&self) -> &'static str {
        match &self {
            Feature::Toggle(_feature) => "toggle",
            Feature::Gradual(_feature) => "gradual",
            Feature::Selective(_feature) => "selective",
            Feature::Value(_feature) => "value",
        }
    }
}

#[derive(Clone, Debug, EnumString, Deserialize, Default)]
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

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GroupFeature {
    pub name: String,
    pub feature_id: String,
    pub feature_type: String,
    pub schedule_type: ScheduleType,
    pub schedule: VexillaSchedule,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFeature {
    pub name: String,
    pub feature_id: String,
    pub schedule_type: ScheduleType,
    pub schedule: VexillaSchedule,
    pub value: bool,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GradualFeature {
    pub name: String,
    pub feature_id: String,
    pub schedule_type: ScheduleType,
    pub schedule: VexillaSchedule,
    pub value: f64,
    pub seed: f64,
}

#[derive(Clone, Debug, EnumString, Deserialize)]
#[serde(tag = "value_type")]
#[strum(serialize_all = "camelCase")]
pub enum ValueFeature {
    #[serde(rename_all = "camelCase")]
    String {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
        value: String,
    },
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

#[derive(Clone, Debug, EnumString, Deserialize)]
#[serde(tag = "value_type")]
#[strum(serialize_all = "camelCase")]
pub enum ValueFeatureNumber {
    #[serde(rename_all = "camelCase")]
    Int {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
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

#[derive(Clone, Debug, EnumString, Deserialize)]
#[serde(tag = "number_type")]
#[strum(serialize_all = "camelCase")]
pub enum SelectiveFeatureNumber {
    #[serde(rename_all = "camelCase")]
    Int {
        name: String,
        feature_id: String,
        schedule_type: ScheduleType,
        schedule: VexillaSchedule,
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

#[derive(Clone, Debug, EnumString, Deserialize)]
#[serde(tag = "valueType")]
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

#[derive(Clone, Copy, Debug, EnumString, Deserialize, Default)]
#[strum(serialize_all = "camelCase")]
pub enum ScheduleTimeType {
    #[default]
    #[serde(rename = "none")]
    None,
    #[serde(rename = "startEnd")]
    StartEnd,
    #[serde(rename = "daily")]
    Daily,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VexillaSchedule {
    pub start: i64,
    pub end: i64,
    pub timezone: String, // TODO: default to UTC when needed
    pub time_type: ScheduleTimeType,
    pub start_time: i64,
    pub end_time: i64,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ManifestGroup {
    pub name: String,
    pub group_id: String,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PublishedGroupMeta {
    pub version: String,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DefaultFeatureValues {
    pub toggle: ToggleFeature,
    pub gradual: GradualFeature,
    pub selective: SelectiveFeature,
    pub value: ValueFeature,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PublishedEnvironment {
    pub name: String,
    pub environment_id: String,
    pub features: HashMap<String, Feature>,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub version: String,
    pub groups: Vec<ManifestGroup>,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FlagGroup {
    pub name: String,
    pub group_id: String,
    pub environments: HashMap<String, PublishedEnvironment>,
    pub features: HashMap<String, GroupFeature>,
    pub meta: PublishedGroupMeta,
}

#[derive(Clone, Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RealIds {
    pub real_group_id: String,
    pub real_feature_id: String,
    pub real_environment_id: String,
}
