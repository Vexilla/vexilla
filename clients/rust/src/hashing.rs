const FNV32_OFFSET_BASIS: u32 = 2166136261;
const FNV32_PRIME: u32 = 16777619;

pub fn hash_fnv32a(value: &str) -> u32 {
    value.bytes().fold(FNV32_OFFSET_BASIS, |hash, byte| {
        (hash ^ u32::from(byte)).wrapping_mul(FNV32_PRIME)
    })
}
pub fn hash_value(value: &str, seed: f64) -> f64 {
    f64::from(hash_fnv32a(value)) * seed % 1000.0 / 1000.0
}
pub fn numeric_text(value: f64) -> Result<String, crate::types::VexillaError> {
    if !value.is_finite() {
        return Err(crate::types::VexillaError::InvalidInstanceId);
    }
    Ok(ryu_js::Buffer::new().format(value).to_owned())
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn hashing_works() {
        let user_id = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
        let should_seed = 0.32;
        let should_not_seed = 0.22;

        let working_result = hash_value(user_id, should_seed);
        let non_working_result = hash_value(user_id, should_not_seed);

        assert!(working_result <= 0.4);
        assert!(non_working_result > 0.4);
    }
}
