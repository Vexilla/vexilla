use crate::types::VexillaError;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Unicode {
    lower: HashMap<String, String>,
    cased_ranges: Vec<[u32; 2]>,
    ignorable_ranges: Vec<[u32; 2]>,
}
#[derive(Deserialize)]
struct Timezone {
    identifiers: HashSet<String>,
}
#[derive(Deserialize)]
struct Compatibility {
    unicode: Unicode,
    timezone: Timezone,
}
fn data() -> Result<&'static Compatibility, VexillaError> {
    static DATA: OnceLock<Result<Compatibility, serde_json::Error>> = OnceLock::new();
    match DATA.get_or_init(|| serde_json::from_str(include_str!("compatibility.json"))) {
        Ok(value) => Ok(value),
        Err(error) => Err(VexillaError::Validation(error.to_string())),
    }
}
fn in_ranges(code: char, ranges: &[[u32; 2]]) -> bool {
    let code = code as u32;
    ranges
        .binary_search_by(|range| {
            if code < range[0] {
                std::cmp::Ordering::Greater
            } else if code > range[1] {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Equal
            }
        })
        .is_ok()
}
fn lower(text: &str, data: &Unicode) -> String {
    let chars: Vec<_> = text.chars().collect();
    let mut result = String::new();
    for (index, ch) in chars.iter().copied().enumerate() {
        if ch == 'Σ' {
            let before = chars[..index]
                .iter()
                .rev()
                .find(|&&c| !in_ranges(c, &data.ignorable_ranges));
            let after = chars[index + 1..]
                .iter()
                .find(|&&c| !in_ranges(c, &data.ignorable_ranges));
            let final_sigma = before.is_some_and(|&c| in_ranges(c, &data.cased_ranges))
                && !after.is_some_and(|&c| in_ranges(c, &data.cased_ranges));
            result.push(if final_sigma { 'ς' } else { 'σ' });
        } else if let Some(mapped) = data.lower.get(&ch.to_string()) {
            result.push_str(mapped);
        } else {
            result.push(ch);
        }
    }
    result
}
fn upper(ch: char) -> bool {
    matches!(ch, 'A'..='Z' | 'À'..='Ö' | 'Ø'..='Þ')
}
fn base_lower(ch: char) -> bool {
    matches!(ch, 'a'..='z' | 'ß'..='ö' | 'ø'..='ÿ')
}
fn symbol(ch: char) -> bool {
    matches!(ch as u32, 32..=38 | 40..=47 | 58..=64 | 91..=96 | 123..=126 | 160..=191 | 215 | 247)
}
pub fn normalize(text: &str) -> Result<String, VexillaError> {
    let data = &data()?.unicode;
    let has_room = text.chars().any(symbol);
    let prepared = if !text.is_empty() && !text.chars().any(base_lower) {
        lower(text, data)
    } else {
        text.to_owned()
    };
    let chars: Vec<_> = prepared.chars().collect();
    let mut result = String::new();
    let mut index = 0;
    while index < chars.len() {
        let mut end = index + 1;
        while end < chars.len() && upper(chars[end]) {
            end += 1;
        }
        result.push(chars[index]);
        if !has_room && !upper(chars[index]) && end > index + 1 {
            result.push(' ');
            if end > index + 2 {
                result.extend(chars[index + 1..end - 1].iter());
                result.push(' ');
            }
            result.push(chars[end - 1]);
            index = end;
        } else {
            index += 1;
        }
    }
    let chars: Vec<_> = lower(&result, data).chars().collect();
    result.clear();
    index = 0;
    while index < chars.len() {
        if symbol(chars[index]) {
            while index < chars.len() && symbol(chars[index]) {
                index += 1;
            }
            if index < chars.len() {
                result.push('-');
                result.push(chars[index]);
                index += 1;
            }
        } else {
            result.push(chars[index]);
            index += 1;
        }
    }
    Ok(result.replace('\'', ""))
}
pub fn timezone(text: &str) -> Result<bool, VexillaError> {
    let identifiers = &data()?.timezone.identifiers;
    if identifiers
        .iter()
        .any(|name| name.eq_ignore_ascii_case(text))
    {
        return Ok(true);
    }
    let b = text.as_bytes();
    if !matches!(b.first(), Some(b'+') | Some(b'-')) {
        return Ok(false);
    }
    let digits: Vec<_> = b[1..].iter().copied().filter(|&c| c != b':').collect();
    if !matches!(b.len(), 3 | 5 | 6)
        || b.len() == 6 && b[3] != b':'
        || b.len() != 6 && b.contains(&b':')
        || !digits.iter().all(u8::is_ascii_digit)
        || !matches!(digits.len(), 2 | 4)
    {
        return Ok(false);
    }
    let hour = (digits[0] - b'0') * 10 + digits[1] - b'0';
    let minute = if digits.len() == 4 {
        (digits[2] - b'0') * 10 + digits[3] - b'0'
    } else {
        0
    };
    Ok(hour < 24 && minute < 60)
}
