use reqwest::Url;
use serde::Deserialize;
use serde_json::map::Map;
use serde_json::{Result, Value};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct VexillaClient {
    environment: String,
    base_url: String,
    custom_instance_hash: String,
    flags: VexillaFlags,
}

const VEXILLA_FLAG_TYPE_TOGGLE: &str = "toggle";
const VEXILLA_FLAG_TYPE_GRADUAL: &str = "gradual";

#[derive(Debug, Clone, Deserialize)]
struct VexillaFlagBase {
    flag_type: String,
}

#[derive(Debug, Deserialize)]
struct VexillaFlagToggle {
    flag_type: String,
    value: bool,
}

#[derive(Debug, Deserialize)]
struct VexillaFlagGradual {
    flag_type: String,
    value: u8,
    seed: f64,
}

#[derive(Debug, Deserialize)]
pub struct VexillaFlags {
    base_flags: HashMap<String, HashMap<String, HashMap<String, VexillaFlagBase>>>,
    toggle_flags: HashMap<String, HashMap<String, HashMap<String, VexillaFlagToggle>>>,
    gradual_flags: HashMap<String, HashMap<String, HashMap<String, VexillaFlagGradual>>>,
}

#[derive(Deserialize)]
pub struct VexillaFlagsResponse {
    environments: Map<String, Value>,
}

impl VexillaClient {
    pub fn new(environment: &str, base_url: &str, custom_instance_hash: &str) -> VexillaClient {
        VexillaClient {
            environment: environment.to_owned(),
            base_url: base_url.to_owned(),
            custom_instance_hash: custom_instance_hash.to_owned(),
            flags: VexillaFlags {
                base_flags: HashMap::new(),
                toggle_flags: HashMap::new(),
                gradual_flags: HashMap::new(),
            },
        }
    }

    #[tokio::main]
    pub async fn fetch_flags(&self, file_name: &str) -> Result<VexillaFlags> {
        let url = format!("{}/{}", self.base_url, file_name);

        let response_text = reqwest::get(Url::parse(url.as_ref()).unwrap())
            .await
            .unwrap()
            .text()
            .await
            .unwrap();

        let flags = self.flags_from_string(response_text).unwrap();

        Ok(flags)
    }

    pub fn fetch_flags_blocking(&self, file_name: &str) -> Result<VexillaFlags> {
        let url = format!("{}/{}", self.base_url, file_name);
        let parsed_url = Url::parse(url.as_ref()).unwrap();

        let response_text = reqwest::blocking::get(parsed_url).unwrap().text().unwrap();

        let flags = self.flags_from_string(response_text).unwrap();

        Ok(flags)
    }

    pub fn set_flags(&mut self, flags: VexillaFlags) {
        self.flags = flags;
    }

    pub fn should(&self, feature_name: &str) -> bool {
        let untagged = "untagged".to_owned();
        let flag_type = self.flags.base_flags[&self.environment][&untagged][feature_name]
            .flag_type
            .clone();

        match flag_type.as_ref() {
            VEXILLA_FLAG_TYPE_TOGGLE => {
                self.flags.toggle_flags[&self.environment][&untagged][feature_name].value
            }

            VEXILLA_FLAG_TYPE_GRADUAL => {
                self.hash_instance_id(
                    self.flags.gradual_flags[&self.environment][&untagged][feature_name].seed,
                ) < self.flags.gradual_flags[&self.environment][&untagged][feature_name].value
            }

            _ => false,
        }
    }

    fn hash_instance_id(&self, seed: f64) -> u8 {
        let total = &self
            .custom_instance_hash
            .chars()
            .fold(0, |total, character| total + character as u32);

        let calculated = (f64::from(total.to_owned()) * seed * 42.0).floor();

        (calculated as u64 % 100) as u8
    }

    fn flags_from_string(&self, response_text: String) -> Result<VexillaFlags> {
        let flags_response: VexillaFlagsResponse = serde_json::from_str(response_text.as_ref())?;

        let mut base_flags: HashMap<String, HashMap<String, HashMap<String, VexillaFlagBase>>> =
            HashMap::new();
        let mut toggle_flags: HashMap<String, HashMap<String, HashMap<String, VexillaFlagToggle>>> =
            HashMap::new();
        let mut gradual_flags: HashMap<
            String,
            HashMap<String, HashMap<String, VexillaFlagGradual>>,
        > = HashMap::new();

        for environment_key in flags_response.environments.keys() {
            let environment = flags_response.environments[environment_key].clone();
            for feature_set_key in Map::from(environment.as_object().unwrap().clone()).keys() {
                let feature_set = environment[feature_set_key].clone();
                for feature_key in Map::from(feature_set.as_object().unwrap().clone()).keys() {
                    let feature = feature_set[feature_key].clone();

                    if !base_flags.contains_key(environment_key) {
                        base_flags.insert(environment_key.to_owned(), HashMap::new());
                    }

                    if !base_flags[environment_key].contains_key(feature_set_key) {
                        base_flags
                            .get_mut(environment_key)
                            .unwrap()
                            .insert(feature_set_key.to_owned(), HashMap::new());
                    }

                    let feature_type_string = feature["type"].as_str().unwrap().to_string();

                    base_flags
                        .get_mut(environment_key)
                        .unwrap()
                        .get_mut(feature_set_key)
                        .unwrap()
                        .insert(
                            feature_key.to_owned(),
                            VexillaFlagBase {
                                flag_type: feature_type_string.clone(),
                            },
                        );

                    match feature_type_string.as_ref() {
                        VEXILLA_FLAG_TYPE_TOGGLE => {
                            if !toggle_flags.contains_key(environment_key) {
                                toggle_flags.insert(environment_key.to_owned(), HashMap::new());
                            }

                            if !toggle_flags[environment_key].contains_key(feature_set_key) {
                                toggle_flags
                                    .get_mut(environment_key)
                                    .unwrap()
                                    .insert(feature_set_key.to_owned(), HashMap::new());
                            }

                            toggle_flags
                                .get_mut(environment_key)
                                .unwrap()
                                .get_mut(feature_set_key)
                                .unwrap()
                                .insert(
                                    feature_key.to_owned(),
                                    VexillaFlagToggle {
                                        flag_type: feature_type_string.clone(),
                                        value: feature["value"].as_bool().unwrap(),
                                    },
                                );
                        }

                        VEXILLA_FLAG_TYPE_GRADUAL => {
                            if !gradual_flags.contains_key(environment_key) {
                                gradual_flags.insert(environment_key.to_owned(), HashMap::new());
                            }

                            if !gradual_flags[environment_key].contains_key(feature_set_key) {
                                gradual_flags
                                    .get_mut(environment_key)
                                    .unwrap()
                                    .insert(feature_set_key.to_owned(), HashMap::new());
                            }

                            gradual_flags
                                .get_mut(environment_key)
                                .unwrap()
                                .get_mut(feature_set_key)
                                .unwrap()
                                .insert(
                                    feature_key.to_owned(),
                                    VexillaFlagGradual {
                                        flag_type: feature_type_string.clone(),
                                        value: feature["value"].as_u64().unwrap() as u8,
                                        seed: feature["seed"].as_f64().unwrap(),
                                    },
                                );
                        }

                        _ => (),
                    }
                }
            }
        }

        Ok(VexillaFlags {
            base_flags: base_flags,
            toggle_flags: toggle_flags,
            gradual_flags: gradual_flags,
        })
    }
}

#[cfg(test)]
mod tests {

    use super::*;

    // #[test]
    // fn client_works() {

    // }

    #[test]
    fn hashing_works() {
        let mut client = VexillaClient::new(
            "dev",
            "https://streamparrot-feature-flags.s3.amazonaws.com",
            "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a",
        );

        let flags = client.fetch_flags_blocking("features.json").unwrap();

        client.set_flags(flags);

        let should = client.should("testingWorkingGradual");

        assert_eq!(should, true);

        let should_not = client.should("testingNonWorkingGradual");

        assert_eq!(should_not, false);
    }
}
