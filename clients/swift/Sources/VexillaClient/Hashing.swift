import Foundation

public enum InstanceId {
    case missing, string(String), integer(Int64), number(Double), invalid
}
func instanceText(_ instance: InstanceId) throws -> String {
    let number: Double
    switch instance {
    case let .string(text): return text
    case let .integer(value):
        guard let exact = Double(exactly: value) else { throw VexillaError("instance", "Integer ID is not exactly binary64") }
        number = exact
    case let .number(value): number = value
    case .missing, .invalid: throw VexillaError("instance", "A finite numeric or string instance ID is required")
    }
    guard number.isFinite else { throw VexillaError("instance", "Finite instance ID required") }
    if number == 0 { return "0" }
    let sign = number < 0 ? "-" : ""
    let parts = String(abs(number)).lowercased().split(separator: "e")
    let mantissa = Array(parts[0])
    var point = mantissa.firstIndex(of: ".") ?? mantissa.count
    if parts.count > 1 { point += Int(parts[1])! }
    var digits = mantissa.filter { $0 != "." }
    while digits.first == "0" { digits.removeFirst(); point -= 1 }
    while digits.last == "0" { digits.removeLast() }
    if point > 0 && point <= 21 {
        if digits.count <= point { return sign + String(digits) + String(repeating: "0", count: point - digits.count) }
        return sign + String(digits.prefix(point)) + "." + String(digits.dropFirst(point))
    }
    if point > -6 && point <= 0 { return sign + "0." + String(repeating: "0", count: -point) + String(digits) }
    let exponent = point - 1
    return sign + String(digits[0]) + (digits.count > 1 ? "." + String(digits.dropFirst()) : "") + "e" + (exponent >= 0 ? "+" : "-") + String(abs(exponent))
}
func hashFnv32a(_ text: String) -> UInt32 {
    var value: UInt32 = 2166136261
    for byte in text.utf8 { value = (value ^ UInt32(byte)) &* 16777619 }
    return value
}
func hashString(stringToHash: String, seed: Double) -> Double {
    (Double(hashFnv32a(stringToHash)) * seed).truncatingRemainder(dividingBy: 1000.0) / 1000.0
}
func hashInt(intToHash: Int, seed: Double) throws -> Double { try hashInt64(intToHash: Int64(intToHash), seed: seed) }
func hashInt64(intToHash: Int64, seed: Double) throws -> Double { try hashString(stringToHash: instanceText(.integer(intToHash)), seed: seed) }
func hashFloat(floatToHash: Float, seed: Double) throws -> Double { try hashFloat64(floatToHash: Double(floatToHash), seed: seed) }
func hashFloat64(floatToHash: Double, seed: Double) throws -> Double { try hashString(stringToHash: instanceText(.number(floatToHash)), seed: seed) }
