pub fn hash_value(value: &str, seed: f64) -> f64 {
    let total = value
        .chars()
        .fold(0, |total, character| total + character as u32);

    let calculated = (f64::from(total.to_owned()) * seed * 42.0).floor();

    calculated % 100.0 / 100.0
}

#[cfg(test)]
mod tests {

    use super::*;

    // #[test]
    // fn client_works() {

    // }

    #[test]
    fn hashing_works() {
        let user_id = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";
        let should_seed = 0.11;
        let should_not_seed = 0.22;

        let should = hash_value(user_id, should_seed) < 0.4;
        let should_not = hash_value(user_id, should_not_seed) < 0.4;

        assert_eq!(should, true);
        assert_eq!(should_not, false);
    }
}
