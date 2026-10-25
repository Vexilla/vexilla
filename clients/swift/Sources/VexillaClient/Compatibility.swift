import Foundation

enum Compatibility {
    private struct Pinned {
        let lower: StringMap<String>
        let cased: [(UInt32, UInt32)]
        let ignorable: [(UInt32, UInt32)]
        let timezones: Set<Data>
        let offset: NSRegularExpression
        init() throws {
            let raw = try Wire.decode(Data(CompatibilityData.json.utf8))
            var mapping = StringMap<String>()
            for item in try raw["unicode"]["lower"].object() {
                mapping[item.key] = try item.value.text()
            }
            lower = mapping
            func ranges(_ field: String) throws -> [(UInt32, UInt32)] {
                try raw["unicode"][field].array().map { pair in
                    let items = try pair.array()
                    return (UInt32(try items[0].number(true)), UInt32(try items[1].number(true)))
                }
            }
            cased = try ranges("casedRanges")
            ignorable = try ranges("ignorableRanges")
            timezones = Set(
                try raw["timezone"]["identifiers"].array().map {
                    Data(asciiLower(try $0.text()).utf8)
                })
            offset = try NSRegularExpression(pattern: raw["timezone"]["offsetPattern"].text())
        }
    }
    private static let pinned = Result { try Pinned() }
    private static func asciiLower(_ text: String) -> String {
        String(
            String.UnicodeScalarView(
                text.unicodeScalars.map { scalar in
                    scalar.value >= 65 && scalar.value <= 90
                        ? Unicode.Scalar(scalar.value + 32)! : scalar
                }))
    }
    static func timezone(_ text: String) throws -> Bool {
        let data = try pinned.get()
        if data.timezones.contains(Data(asciiLower(text).utf8)) { return true }
        let range = NSRange(location: 0, length: text.utf16.count)
        return data.offset.firstMatch(in: text, range: range)?.range == range
    }
    private static func contains(_ code: UInt32, _ ranges: [(UInt32, UInt32)]) -> Bool {
        var first = 0
        var last = ranges.count - 1
        while first <= last {
            let mid = (first + last) / 2
            if code < ranges[mid].0 {
                last = mid - 1
            } else if code > ranges[mid].1 {
                first = mid + 1
            } else {
                return true
            }
        }
        return false
    }
    private static func lower(_ text: String) throws -> String {
        let data = try pinned.get()
        let chars = Array(text.unicodeScalars)
        var output = ""
        for (index, scalar) in chars.enumerated() {
            if scalar.value == 0x03a3 {
                var before = index - 1
                var after = index + 1
                while before >= 0 && contains(chars[before].value, data.ignorable) { before -= 1 }
                while after < chars.count && contains(chars[after].value, data.ignorable) {
                    after += 1
                }
                output +=
                    before >= 0 && contains(chars[before].value, data.cased)
                        && (after == chars.count || !contains(chars[after].value, data.cased))
                    ? "ς" : "σ"
            } else {
                output += data.lower[String(scalar)] ?? String(scalar)
            }
        }
        return output
    }
    private static func upper(_ scalar: Unicode.Scalar) -> Bool {
        let r = scalar.value
        return (65...90).contains(r) || (192...214).contains(r) || (216...222).contains(r)
    }
    private static func baseLower(_ scalar: Unicode.Scalar) -> Bool {
        let r = scalar.value
        return (97...122).contains(r) || (223...246).contains(r) || (248...255).contains(r)
    }
    private static func symbol(_ scalar: Unicode.Scalar) -> Bool {
        let r = scalar.value
        return (32...38).contains(r) || (40...47).contains(r) || (58...64).contains(r)
            || (91...96).contains(r) || (123...126).contains(r) || (160...191).contains(r)
            || r == 215 || r == 247
    }
    static func normalize(_ input: String) throws -> String {
        var text = input
        var chars = Array(text.unicodeScalars)
        let hasRoom = chars.contains(where: symbol)
        if !chars.contains(where: baseLower) {
            text = try lower(text)
            chars = Array(text.unicodeScalars)
        }
        if !hasRoom {
            var output = ""
            var i = 0
            while i < chars.count {
                var j = i + 1
                while j < chars.count && upper(chars[j]) { j += 1 }
                output += String(chars[i])
                if !upper(chars[i]) && j > i + 1 {
                    output += " "
                    if j > i + 2 {
                        output += String(String.UnicodeScalarView(chars[(i + 1)..<(j - 1)])) + " "
                    }
                    output += String(chars[j - 1])
                    i = j
                } else {
                    i += 1
                }
            }
            text = output
        }
        chars = Array(try lower(text).unicodeScalars)
        var output = ""
        var i = 0
        while i < chars.count {
            if symbol(chars[i]) {
                while i < chars.count && symbol(chars[i]) { i += 1 }
                if i < chars.count {
                    output += "-" + String(chars[i])
                    i += 1
                }
            } else {
                output += String(chars[i])
                i += 1
            }
        }
        return output.replacingOccurrences(of: "'", with: "")
    }
}
