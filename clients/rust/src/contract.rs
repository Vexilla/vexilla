use super::*;
use chrono::TimeZone;
use serde_json::Value;
use std::{env, fs, path::PathBuf};

fn read(name: &str) -> String {
    let dir = PathBuf::from(
        env::var("VEXILLA_CONTRACT_DIR").expect("generate the shared contract first"),
    );
    fs::read_to_string(dir.join(name)).expect("contract artifact")
}
fn fetch(url: &str) -> VexillaResult<String> {
    Ok(read(url.rsplit('/').next().expect("file name")))
}

#[test]
fn shared_contract_seed_bounds() {
    if env::var_os("VEXILLA_CONTRACT_DIR").is_none() {
        return;
    }
    let expected: Value = serde_json::from_str(&read("expected.json")).unwrap();
    let original: Value = serde_json::from_str(&read("contract-group.json")).unwrap();
    for sample in expected["seedCases"].as_array().unwrap() {
        let mut group = original.clone();
        group["environments"]["dev"]["features"]["gradual"]["seed"] = sample["value"].clone();
        let result = serde_json::from_value::<FlagGroup>(group);
        assert_eq!(
            result.is_ok(),
            sample["valid"].as_bool().unwrap(),
            "seed {}",
            sample["value"]
        );
    }
}

#[test]
fn shared_contract() {
    if env::var_os("VEXILLA_CONTRACT_DIR").is_none() {
        return;
    }
    let expected: Value = serde_json::from_str(&read("expected.json")).unwrap();
    for (index, (id, name)) in [("dev", "Development"), ("prod", "Production")]
        .iter()
        .enumerate()
    {
        let env = &expected["environments"][index];
        for names in [false, true] {
            let mut client = VexillaClient::new(
                if names { *name } else { *id },
                "https://contract",
                "member",
            );
            client.sync_manifest(fetch).unwrap();
            let group = if names { "Contract" } else { "contract-group" };
            let decoded = client.get_flags(group, fetch).unwrap();
            match &decoded.environments[*id].features["gradual"] {
                Feature::Gradual(f) => {
                    assert_eq!(f.seed, env["seed"].as_f64().unwrap());
                    assert_eq!(f.value, env["threshold"].as_f64().unwrap());
                }
                _ => panic!("gradual discriminator lost"),
            }
            for fid in [
                "scheduled-global",
                "scheduled-environment",
                "scheduled-daily",
                "scheduled-active",
            ] {
                if let Feature::Toggle(f) = &decoded.environments[*id].features[fid] {
                    let clock = chrono::Utc
                        .timestamp_millis_opt(expected["referenceClock"].as_i64().unwrap())
                        .single()
                        .unwrap();
                    assert_eq!(
                        is_schedule_active_with_now(
                            f.schedule.clone(),
                            f.schedule_type.clone(),
                            clock
                        )
                        .unwrap(),
                        fid == "scheduled-active"
                    );
                } else {
                    panic!("schedule discriminator lost");
                }
            }
            client.set_flags(decoded).unwrap();
            for (fid, fname, key) in [
                ("toggle", "Toggle", "toggle"),
                ("gradual", "Gradual", "gradual"),
                ("selective-string", "Selective String", "selectiveString"),
                ("regression", "Type Change Regression", "regression"),
                ("scheduled-active", "Scheduled Active", "scheduledActive"),
            ] {
                assert_eq!(
                    client
                        .should_custom_str(
                            group,
                            if names { fname } else { fid },
                            if fid == "gradual" {
                                "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
                            } else {
                                "member"
                            }
                        )
                        .unwrap(),
                    env[key].as_bool().unwrap()
                );
            }
            for n in [0, 42] {
                assert_eq!(
                    client
                        .should_custom_int(
                            group,
                            if names {
                                "Selective Int"
                            } else {
                                "selective-int"
                            },
                            n
                        )
                        .unwrap(),
                    env["selectiveInt"].as_bool().unwrap()
                );
            }
            for n in [0.0, 4.25] {
                assert_eq!(
                    client
                        .should_custom_float(
                            group,
                            if names {
                                "Selective Float"
                            } else {
                                "selective-float"
                            },
                            n
                        )
                        .unwrap(),
                    env["selectiveFloat"].as_bool().unwrap()
                );
            }
            assert_eq!(
                client
                    .value_str(
                        group,
                        if names {
                            "Value String"
                        } else {
                            "value-string"
                        },
                        "fallback"
                    )
                    .unwrap(),
                env["string"].as_str().unwrap()
            );
            assert_eq!(
                client
                    .value_int(group, if names { "Value Int" } else { "value-int" }, -1)
                    .unwrap(),
                env["int"].as_i64().unwrap()
            );
            assert_eq!(
                client
                    .value_float(
                        group,
                        if names { "Value Float" } else { "value-float" },
                        -1.0
                    )
                    .unwrap(),
                env["float"].as_f64().unwrap()
            );
            for f in [
                "scheduled-global",
                "scheduled-environment",
                "scheduled-daily",
            ] {
                assert!(!client.should(group, f).unwrap());
            }
        }
    }
}
