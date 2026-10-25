use super::*;
use serde_json::{json, Value};
use std::{env, fs, path::PathBuf};

fn read(name: &str) -> String {
    fs::read_to_string(
        PathBuf::from(env::var("VEXILLA_CONTRACT_DIR").expect("Use contract/scripts/run.cjs"))
            .join(name),
    )
    .expect("contract artifact")
}
fn value(name: &str) -> Value {
    serde_json::from_str(&read(name)).unwrap()
}
fn fetch(url: &str) -> VexillaResult<String> {
    Ok(read(url.rsplit('/').next().unwrap()))
}
// The legacy public key APIs accept static string/enum keys. Test allocations
// preserve the exact input bytes for the lifetime of this short-lived process.
fn key(text: &str) -> &'static str {
    Box::leak(text.to_owned().into_boxed_str())
}
fn instance(value: &Value) -> InstanceId {
    match value {
        Value::Null => InstanceId::Missing,
        Value::String(text) => InstanceId::Text(text.clone()),
        Value::Number(n) => n.as_i64().map_or_else(
            || InstanceId::Float(n.as_f64().unwrap()),
            InstanceId::Integer,
        ),
        _ => InstanceId::Invalid,
    }
}
fn outcome(result: &VexillaResult<Value>) -> Value {
    match result {
        Ok(value) => json!({"value":value}),
        Err(error) => json!({"error": match error {
            VexillaError::Validation(_)=>"validation", VexillaError::Fetch(_)=>"fetch", VexillaError::InvalidInstanceId=>"instance",
            VexillaError::GroupLookupKeyNotFound|VexillaError::FlagLookupKeyNotFound|VexillaError::EnvironmentLookupKeyNotFound|VexillaError::FlagGroupKeyNotFound|VexillaError::EnvironmentFeatureKeyNotFound=>"lookup",
            VexillaError::InvalidShouldFeatureType(_)|VexillaError::InvalidValueFeatureType(_)|VexillaError::InvalidValueStringType(_)|VexillaError::InvalidValueI64Type(_)|VexillaError::InvalidValueF64Type(_)=>"kind",
            _=>panic!("Unexpected production error: {:?}",error),
        }}),
    }
}
fn comparable(actual: &Value, expected: &Value) -> bool {
    match (actual, expected) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| comparable(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .all(|(key, a)| b.get(key).is_some_and(|b| comparable(a, b)))
        }
        _ => actual == expected,
    }
}
fn observe(observations: &mut Vec<Value>, id: &str, actual: Value, expected: &Value) {
    assert!(
        comparable(&actual, expected),
        "{}: actual={}, expected={}",
        id,
        actual,
        expected
    );
    observations.push(json!({"caseId":id,"outcome":actual}));
}
fn constructor<T: serde::de::DeserializeOwned>(value: Value) -> VexillaResult<T> {
    serde_json::from_value(value).map_err(|error| VexillaError::Validation(error.to_string()))
}
fn tokens(path: &str) -> Vec<String> {
    assert!(path.starts_with('/'));
    path[1..]
        .split('/')
        .map(|s| s.replace("~1", "/").replace("~0", "~"))
        .collect()
}
fn at<'a>(value: &'a Value, keys: &[String]) -> &'a Value {
    keys.iter().fold(value, |value, key| {
        if value.is_array() {
            &value[key.parse::<usize>().unwrap()]
        } else {
            &value[key]
        }
    })
}
fn edit(value: &mut Value, keys: &[String], op: &str, item: Value) {
    if keys.len() > 1 {
        if value.is_array() {
            edit(
                &mut value[keys[0].parse::<usize>().unwrap()],
                &keys[1..],
                op,
                item,
            );
        } else {
            edit(&mut value[&keys[0]], &keys[1..], op, item);
        }
        return;
    }
    if let Some(array) = value.as_array_mut() {
        let index = keys[0].parse::<usize>().unwrap();
        if op == "remove" {
            array.remove(index);
        } else if index == array.len() {
            array.push(item);
        } else {
            array[index] = item;
        }
    } else {
        let object = value.as_object_mut().unwrap();
        if op == "remove" {
            assert!(object.remove(&keys[0]).is_some());
        } else {
            object.insert(keys[0].clone(), item);
        }
    }
}
fn mutate(value: &mut Value, mutations: &Value) -> VexillaResult<()> {
    for m in mutations.as_array().unwrap() {
        // serde_json::Number rejects nonfinite native construction. No null
        // substitution or serialization repair may turn it into valid data.
        if m.get("nativeNumber").is_some() {
            return Err(VexillaError::Validation(
                "Nonfinite JSON number cannot be constructed".to_owned(),
            ));
        }
        let op = m["op"].as_str().unwrap();
        let item = if let Some(wire) = m["wireString"].as_str() {
            serde_json::from_str(wire)
                .map_err(|error| VexillaError::Validation(error.to_string()))?
        } else if op == "copy" {
            at(value, &tokens(m["from"].as_str().unwrap())).clone()
        } else {
            m["value"].clone()
        };
        edit(value, &tokens(m["path"].as_str().unwrap()), op, item);
    }
    Ok(())
}
fn new_client(env: &str, id: &Value) -> VexillaClient {
    VexillaClient::new(key(env), "https://contract", instance(id))
}
fn value_api(
    c: &VexillaClient,
    group: &str,
    feature: &str,
    default: &Value,
) -> VexillaResult<Value> {
    let feature = key(feature);
    if feature.contains("float") || feature == "Value Float" {
        c.value_float(group, feature, default.as_f64().unwrap_or(0.0))
            .map(Value::from)
    } else if feature.contains("string") || feature == "Value String" {
        c.value_str(group, feature, key(default.as_str().unwrap_or("fallback")))
            .map(Value::from)
    } else {
        c.value_int(group, feature, default.as_i64().unwrap_or(0))
            .map(Value::from)
    }
}
#[derive(Clone)]
enum Data {
    Json(Value),
    Manifest(Manifest),
    Group(FlagGroup),
}
impl Data {
    fn manifest(&self) -> VexillaResult<Manifest> {
        match self {
            Self::Json(value) => constructor(value.clone()),
            Self::Manifest(value) => Ok(value.clone()),
            _ => panic!("Wrong test data type"),
        }
    }
    fn group(&self) -> VexillaResult<FlagGroup> {
        match self {
            Self::Json(value) => constructor(value.clone()),
            Self::Group(value) => Ok(value.clone()),
            _ => panic!("Wrong test data type"),
        }
    }
    fn json(&self) -> &Value {
        match self {
            Self::Json(value) => value,
            _ => panic!("Expected raw test data"),
        }
    }
}
#[test]
fn shared_contract() {
    if env::var_os("VEXILLA_CONTRACT_DIR").is_none() {
        return;
    }
    let expected = value("expected.json");
    let parity = value("parity.json");
    let mut observations = Vec::new();
    for section in [
        "hashes",
        "numbers",
        "gradual",
        "schedules",
        "validation",
        "operations",
        "aliases",
        "timezones",
    ] {
        for sample in parity[section].as_array().unwrap() {
            let result: VexillaResult<Value> = (|| match section {
                "hashes" => Ok(json!(hash_fnv32a(sample["text"].as_str().unwrap()))),
                "numbers" => {
                    let text = numeric_text(sample["instance"].as_f64().unwrap())?;
                    Ok(json!({"hash":hash_fnv32a(&text),"text":text}))
                }
                "gradual" => {
                    let mut c = new_client("prod", &json!("member"));
                    c.sync_manifest(fetch)?;
                    let mut g = value("contract-group.json");
                    g["environments"]["prod"]["features"]["gradual"]["seed"] =
                        sample["seed"].clone();
                    g["environments"]["prod"]["features"]["gradual"]["value"] =
                        sample["threshold"].clone();
                    c.set_flags(constructor(g)?)?;
                    let text = match instance(&sample["instance"]) {
                        InstanceId::Text(text) => text,
                        _ => numeric_text(sample["instance"].as_f64().unwrap())?,
                    };
                    Ok(
                        json!({"bucket":hash_value(&text,sample["seed"].as_f64().unwrap()),"enabled":c.should_custom("contract-group","gradual",instance(&sample["instance"]))?}),
                    )
                }
                "schedules" => Ok(json!(is_schedule_active_millis(
                    &constructor::<VexillaSchedule>(sample["schedule"].clone())?,
                    &constructor::<ScheduleType>(sample["scheduleType"].clone())?,
                    sample["now"].as_i64().unwrap()
                ))),
                "validation" => {
                    let check = |fetched: bool| -> VexillaResult<Value> {
                        let mut publication = json!({"manifest":value("manifest.json"),"groups":{"contract-group":value("contract-group.json")}});
                        mutate(&mut publication, &sample["mutations"])?;
                        let mut c = new_client("prod", &json!("member"));
                        if fetched {
                            c.sync_manifest(|_| Ok(publication["manifest"].to_string()))?;
                        } else {
                            c.set_manifest(constructor(publication["manifest"].clone())?)?;
                        }
                        for (id, g) in publication["groups"].as_object().unwrap() {
                            if fetched {
                                c.sync_flags(id, |_| Ok(g.to_string()))?;
                            } else {
                                c.set_flags(constructor(g.clone())?)?;
                            }
                        }
                        Ok(json!(true))
                    };
                    let direct_result = check(false);
                    let direct = outcome(&direct_result);
                    let fetched = outcome(&check(true));
                    assert!(
                        comparable(&direct, &fetched),
                        "{} ingestion paths",
                        sample["id"]
                    );
                    direct_result
                }
                "operations" => {
                    let mut clients: HashMap<String, VexillaClient> = HashMap::new();
                    let mut data: HashMap<String, Data> = HashMap::new();
                    let mut results = Vec::new();
                    for step in sample["steps"].as_array().unwrap() {
                        let result = (|| -> VexillaResult<Value> {
                            let op = step["op"].as_str().unwrap();
                            let client = step["client"].as_str().unwrap_or("");
                            let group = step["group"].as_str().unwrap_or("");
                            let feature = step["feature"].as_str().unwrap_or("");
                            let data_key = step["data"].as_str().unwrap_or("");
                            if op == "load" {
                                data.insert(
                                    step["as"].as_str().unwrap().to_owned(),
                                    Data::Json(value(step["file"].as_str().unwrap())),
                                );
                                return Ok(Value::Null);
                            }
                            if op == "new" {
                                clients.insert(
                                    client.to_owned(),
                                    new_client(
                                        step["environment"].as_str().unwrap(),
                                        &step["instance"],
                                    ),
                                );
                                return Ok(Value::Null);
                            }
                            if op == "mutate" {
                                let mut raw = data[data_key].json().clone();
                                mutate(&mut raw, &step["mutations"])?;
                                data.insert(data_key.to_owned(), Data::Json(raw));
                                return Ok(Value::Null);
                            }
                            let callback = |_: &str| -> VexillaResult<String> {
                                if step["callback"]["throws"] == true {
                                    return Err(VexillaError::Unknown);
                                }
                                if let Some(file) = step["callback"]["file"].as_str() {
                                    Ok(read(file))
                                } else {
                                    Ok(data[step["callback"]["data"].as_str().unwrap()]
                                        .json()
                                        .to_string())
                                }
                            };
                            let c = clients.get_mut(client).unwrap();
                            match op {
                                "setManifest" => {
                                    c.set_manifest(data[data_key].manifest()?)?;
                                }
                                "setFlags" => {
                                    c.set_flags(data[data_key].group()?)?;
                                }
                                "getManifest" => {
                                    let result = c.get_manifest(callback)?;
                                    data.insert(
                                        step["as"].as_str().unwrap().to_owned(),
                                        Data::Manifest(result),
                                    );
                                }
                                "getFlags" => {
                                    let result = c.get_flags(group, callback)?;
                                    data.insert(
                                        step["as"].as_str().unwrap().to_owned(),
                                        Data::Group(result),
                                    );
                                }
                                "syncManifest" => {
                                    c.sync_manifest(callback)?;
                                }
                                "syncFlags" => {
                                    c.sync_flags(group, callback)?;
                                }
                                "should" => {
                                    return if step["instance"].is_null() {
                                        c.should(group, key(feature)).map(Value::from)
                                    } else {
                                        c.should_custom(
                                            group,
                                            key(feature),
                                            instance(&step["instance"]),
                                        )
                                        .map(Value::from)
                                    };
                                }
                                "value" => {
                                    return value_api(c, group, feature, &step["default"]);
                                }
                                _ => panic!("Unknown operation: {}", op),
                            }
                            Ok(Value::Null)
                        })();
                        results.push(outcome(&result));
                    }
                    Ok(Value::Array(results))
                }
                "aliases" => compat::normalize(sample["name"].as_str().unwrap()).map(Value::from),
                "timezones" => {
                    let mut c = new_client("prod", &json!("member"));
                    c.sync_manifest(fetch)?;
                    let mut group = value("contract-group.json");
                    group["features"]["toggle"]["schedule"]["timezone"] =
                        sample["timezone"].clone();
                    let result = constructor(group).and_then(|g| c.set_flags(g));
                    Ok(json!(result.is_ok()))
                }
                _ => panic!("Unknown section"),
            })();
            observe(
                &mut observations,
                sample["id"].as_str().unwrap(),
                outcome(&result),
                &sample["expected"],
            );
        }
    }
    for env in expected["environments"].as_array().unwrap() {
        for mode in ["id", "name", "alias"] {
            let lookup = |id: &str, name: &str| -> String {
                match mode {
                    "id" => id.to_owned(),
                    "name" => name.to_owned(),
                    _ => compat::normalize(name).unwrap(),
                }
            };
            let mut c = new_client(
                &lookup(env["id"].as_str().unwrap(), env["name"].as_str().unwrap()),
                &json!("member"),
            );
            c.sync_manifest(fetch).unwrap();
            let group = lookup(
                expected["groupId"].as_str().unwrap(),
                expected["groupName"].as_str().unwrap(),
            );
            c.sync_flags(&group, fetch).unwrap();
            for (index, sample) in expected["cases"].as_array().unwrap().iter().enumerate() {
                let feature = lookup(
                    sample["id"].as_str().unwrap(),
                    sample["name"].as_str().unwrap(),
                );
                let result = if sample["kind"] == "value" {
                    value_api(&c, &group, &feature, &json!("fallback"))
                } else {
                    c.should_custom(&group, key(&feature), instance(&sample["instance"]))
                        .map(Value::from)
                };
                observe(
                    &mut observations,
                    &format!("publication/{}/{mode}/{index}", env["id"].as_str().unwrap()),
                    outcome(&result),
                    &json!({"value":env[sample["expectedKey"].as_str().unwrap()]}),
                );
            }
            let decoded = c.get_flags(&group, fetch).unwrap();
            let mut scheduled = expected["scheduled"].as_array().unwrap().clone();
            scheduled.push(json!("scheduled-active"));
            for id in scheduled {
                let id = id.as_str().unwrap();
                let Feature::Toggle(f) =
                    &decoded.environments[env["id"].as_str().unwrap()].features[id]
                else {
                    panic!("Expected toggle")
                };
                observe(
                    &mut observations,
                    &format!(
                        "publication/{}/{mode}/schedule/{id}",
                        env["id"].as_str().unwrap()
                    ),
                    json!({"value":is_schedule_active_millis(&f.schedule,&f.schedule_type,expected["referenceClock"].as_i64().unwrap())}),
                    &json!({"value":id=="scheduled-active"}),
                );
            }
        }
    }
    if let Ok(file) = env::var("VEXILLA_OBSERVATIONS_FILE") {
        fs::write(file,json!({"protocol":1,"sdk":"rust","runs":[{"runtime":"native","observations":observations}]}).to_string()).unwrap();
    }
}
#[test]
fn shared_contract_raw_unicode_is_rejected_without_decoder_repair() {
    let c = new_client("prod", &json!("member"));
    for wire in [
        r#"{"version":"v1","groups":[],"extra":"\ud800"}"#,
        r#"{"version":"v1","groups":[],"extra":"\udfff"}"#,
        r#"{"version":"v1","groups":[],"\ud800":0}"#,
    ] {
        assert!(matches!(
            c.get_manifest(|_| Ok(wire.to_owned())),
            Err(VexillaError::Validation(_))
        ));
    }
    for wire in [
        r#"{"version":"v1","groups":[],"extra":"\ud83d\ude00"}"#,
        r#"{"version":"v1","groups":[],"extra":"\ufffd"}"#,
    ] {
        assert!(c.get_manifest(|_| Ok(wire.to_owned())).is_ok());
    }
}
#[test]
fn shared_contract_native_nonfinite_and_integer_ids_are_rejected_atomically() {
    if env::var_os("VEXILLA_CONTRACT_DIR").is_none() {
        return;
    }
    let mut c = new_client("prod", &json!("member"));
    c.sync_manifest(fetch).unwrap();
    let mut group = c.get_flags("contract-group", fetch).unwrap();
    c.set_flags(group.clone()).unwrap();
    if let Feature::Gradual(f) = &mut group
        .environments
        .get_mut("prod")
        .unwrap()
        .features
        .get_mut("gradual")
        .unwrap()
    {
        f.seed = f64::NAN;
    }
    assert!(c.set_flags(group).is_err());
    assert!(c.should("contract-group", "toggle").unwrap());
    assert!(matches!(
        c.should_custom_int("contract-group", "gradual", i64::MAX),
        Err(VexillaError::InvalidInstanceId)
    ));
}
