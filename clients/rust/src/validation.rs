use crate::{compat, types::*};
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};

type Result<T = ()> = std::result::Result<T, VexillaError>;
fn invalid(message: &str) -> VexillaError {
    VexillaError::Validation(message.to_owned())
}
fn object(value: &Value) -> Result<&Map<String, Value>> {
    value
        .as_object()
        .ok_or_else(|| invalid("Expected an object"))
}
fn text(value: &Value, nonempty: bool) -> Result<&str> {
    value
        .as_str()
        .filter(|s| !nonempty || !s.is_empty())
        .ok_or_else(|| invalid("Expected a string"))
}
fn number(value: &Value, integer: bool) -> Result {
    let n = value
        .as_f64()
        .ok_or_else(|| invalid("Expected a finite number"))?;
    if !n.is_finite() || integer && (n.fract() != 0.0 || n.abs() > 9007199254740991.0) {
        return Err(invalid(
            "Number violates the existing finite/safe-integer rule",
        ));
    }
    Ok(())
}
fn one_of(value: &Value, allowed: &[&str]) -> bool {
    value.as_str().is_some_and(|value| allowed.contains(&value))
}
fn safe_id(value: &Value) -> Result<&str> {
    let id = text(value, true)?;
    if ["manifest", "config", ".", ".."].contains(&id) || id.contains(['/', '\\', '\0']) {
        return Err(invalid("Unsafe group file identifier"));
    }
    Ok(id)
}
fn add_alias(aliases: &mut HashMap<String, String>, id: &str, name: &str) -> Result {
    for key in [id.to_owned(), name.to_owned(), compat::normalize(name)?] {
        if aliases.get(&key).is_some_and(|owner| owner != id) {
            return Err(invalid("Name shadows another ID/alias"));
        }
        aliases.insert(key, id.to_owned());
    }
    Ok(())
}
fn schedule(value: &Value) -> Result {
    object(value)?;
    for field in ["start", "end", "startTime", "endTime"] {
        number(&value[field], true)?;
    }
    if !one_of(&value["timeType"], &["none", "start/end", "daily"])
        || !compat::timezone(text(&value["timezone"], true)?)?
    {
        return Err(invalid("Invalid schedule representation"));
    }
    Ok(())
}
fn feature(value: &Value) -> Result {
    object(value)?;
    text(&value["name"], false)?;
    text(&value["featureId"], true)?;
    if !one_of(&value["scheduleType"], &["", "global", "environment"]) {
        return Err(invalid("Invalid scheduleType"));
    }
    schedule(&value["schedule"])?;
    match value["featureType"].as_str() {
        Some("toggle") => {
            if !value["value"].is_boolean() {
                return Err(invalid("Toggle value must be boolean"));
            }
        }
        Some("gradual") => {
            number(&value["value"], false)?;
            number(&value["seed"], false)?;
            if !value["seed"]
                .as_f64()
                .is_some_and(|seed| seed > 0.0 && seed <= 1.0)
            {
                return Err(invalid("seed must satisfy 0 < seed <= 1"));
            }
        }
        Some("selective" | "value") => {
            if !one_of(&value["valueType"], &["string", "number"])
                || value["valueType"] == "number"
                    && !one_of(&value["numberType"], &["int", "float"])
            {
                return Err(invalid("Invalid value subtype"));
            }
            let check = |item: &Value| -> Result {
                if value["valueType"] == "string" {
                    text(item, false).map(|_| ())
                } else {
                    number(item, value["numberType"] == "int")
                }
            };
            if value["featureType"] == "selective" {
                for item in value["value"]
                    .as_array()
                    .ok_or_else(|| invalid("Selective value must be an array"))?
                {
                    check(item)?;
                }
            } else {
                check(&value["value"])?;
            }
        }
        _ => {
            return Err(invalid("Unknown featureType"));
        }
    }
    Ok(())
}
fn features(value: &Value) -> Result<&Map<String, Value>> {
    let items = object(value)?;
    let mut aliases = HashMap::new();
    for (id, f) in items {
        feature(f)?;
        if f["featureId"] != *id {
            return Err(invalid("featureId differs from map key"));
        }
        add_alias(&mut aliases, id, text(&f["name"], false)?)?;
    }
    Ok(items)
}
pub fn manifest(value: &Value) -> Result {
    object(value)?;
    if value["version"] != "v1" {
        return Err(invalid("Manifest version must be v1"));
    }
    let groups = value["groups"]
        .as_array()
        .ok_or_else(|| invalid("Manifest groups must be an array"))?;
    let mut seen = HashSet::new();
    let mut aliases = HashMap::new();
    for group in groups {
        object(group)?;
        let id = safe_id(&group["groupId"])?;
        if !seen.insert(id) {
            return Err(invalid("Duplicate manifest group ID"));
        }
        add_alias(&mut aliases, id, text(&group["name"], false)?)?;
    }
    Ok(())
}
pub fn group(value: &Value) -> Result {
    object(value)?;
    safe_id(&value["groupId"])?;
    text(&value["name"], false)?;
    object(&value["meta"])?;
    if value["meta"]["version"] != "v1" {
        return Err(invalid("Group version must be v1"));
    }
    let defaults = features(&value["features"])?;
    let environments = object(&value["environments"])?;
    let mut aliases = HashMap::new();
    for (id, env) in environments {
        object(env)?;
        if id.is_empty() || env["environmentId"] != *id {
            return Err(invalid("environmentId differs from map key"));
        }
        add_alias(&mut aliases, id, text(&env["name"], false)?)?;
        let items = features(&env["features"])?;
        if items.len() != defaults.len() {
            return Err(invalid("Environment feature set differs from defaults"));
        }
        for (fid, f) in items {
            let original = defaults
                .get(fid)
                .ok_or_else(|| invalid("Unknown environment feature"))?;
            for field in ["name", "featureType", "valueType", "numberType"] {
                let value = f.get(field);
                if value != original.get(field)
                    || value.is_some_and(|v| v.is_array() || v.is_object())
                {
                    return Err(invalid(
                        "Environment feature name/subtype differs from defaults",
                    ));
                }
            }
        }
    }
    Ok(())
}
pub fn installed_group(flags: &FlagGroup, manifest: &Manifest) -> Result {
    if !manifest
        .groups
        .iter()
        .any(|entry| entry.group_id == flags.group_id && entry.name == flags.name)
    {
        return Err(invalid("Group must match manifest ID and name"));
    }
    group(&serde_json::to_value(flags).map_err(|error| invalid(&error.to_string()))?)
}
pub fn parsed_manifest(text: &str) -> Result<Manifest> {
    let value: Value = serde_json::from_str(text).map_err(|error| invalid(&error.to_string()))?;
    manifest(&value)?;
    serde_json::from_value(value).map_err(|error| invalid(&error.to_string()))
}
pub fn parsed_group(text: &str) -> Result<FlagGroup> {
    let value: Value = serde_json::from_str(text).map_err(|error| invalid(&error.to_string()))?;
    group(&value)?;
    serde_json::from_value(value).map_err(|error| invalid(&error.to_string()))
}
