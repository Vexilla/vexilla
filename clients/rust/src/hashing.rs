const FNV32_OFFSET_BASIS: u32 = 2166136261;
const FNV32_PRIME: u32 = 16777619;

pub fn hash_value(value: &str, seed: f64) -> f64 {
    let hash_result = value
        .chars()
        .fold(FNV32_OFFSET_BASIS, |hash_result, character| {
            // hash_result + character as u32
            let xord = hash_result ^ u32::from(character);
            (xord.wrapping_mul(FNV32_PRIME)).to_owned()
        });

    f64::from(hash_result.to_owned()) * seed % 1000.0 / 1000.0
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
