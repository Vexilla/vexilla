import Foundation
import CoreFoundation

public struct VexillaError: Error, CustomStringConvertible {
    public let kind: String
    public let description: String
    init(_ kind: String, _ message: String) { self.kind = kind; self.description = message }
}

/// Swift String equality normalizes Unicode. Wire IDs and aliases compare UTF-8.
public struct StringMap<Value>: Sequence, ExpressibleByDictionaryLiteral {
    public typealias Element = (key: String, value: Value)
    private var storage: [Data: Element] = [:]
    public init(_ elements: [Element] = []) { for item in elements { self[item.key] = item.value } }
    public init(dictionaryLiteral elements: (String, Value)...) { self.init(elements.map { (key: $0.0, value: $0.1) }) }
    public subscript(_ key: String) -> Value? {
        get { storage[Data(key.utf8)]?.value }
        set {
            let bytes = Data(key.utf8)
            if let value = newValue { storage[bytes] = (key, value) }
            else { storage.removeValue(forKey: bytes) }
        }
    }
    public var count: Int { storage.count }
    public var keys: [String] { storage.values.map { $0.key } }
    public var values: [Value] { storage.values.map { $0.value } }
    public func makeIterator() -> AnyIterator<Element> {
        var iterator = storage.values.makeIterator()
        return AnyIterator { iterator.next() }
    }
}
func exact(_ left: String, _ right: String) -> Bool { left.utf8.elementsEqual(right.utf8) }

indirect enum Wire {
    case object(StringMap<Wire>), array([Wire]), string(String), number(Double), bool(Bool), null

    subscript(_ key: String) -> Wire {
        guard case let .object(fields) = self else { return .null }
        return fields[key] ?? .null
    }
    func object() throws -> StringMap<Wire> {
        guard case let .object(value) = self else { throw VexillaError("validation", "Expected an object") }
        return value
    }
    func array() throws -> [Wire] {
        guard case let .array(value) = self else { throw VexillaError("validation", "Expected an array") }
        return value
    }
    func text(_ nonempty: Bool = false) throws -> String {
        guard case let .string(value) = self, !nonempty || !value.isEmpty else { throw VexillaError("validation", "Expected a string") }
        return value
    }
    func number(_ integer: Bool = false) throws -> Double {
        guard case let .number(value) = self, value.isFinite,
              !integer || (value.rounded(.towardZero) == value && abs(value) <= 9007199254740991)
        else { throw VexillaError("validation", "Expected a finite number within the field's integer bounds") }
        return value
    }
    static func decode(_ data: Data) throws -> Wire {
        // Encode every key bijectively before Foundation can merge canonically
        // equivalent strings. Validate every original string token before any
        // native parser has the opportunity to substitute a replacement glyph.
        let input = Array(data)
        var encoded: [UInt8] = []
        var index = 0
        let stringDecoder = JSONDecoder()
        let stringEncoder = JSONEncoder()
        let numberSyntax = try NSRegularExpression(pattern: "^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$")
        var numbers: [Double] = []
        do {
            while index < input.count {
                if input[index] == 45 || (48...57).contains(input[index]) {
                    let start = index
                    while index < input.count && [43,45,46,69,101,48,49,50,51,52,53,54,55,56,57].contains(input[index]) { index += 1 }
                    let token = String(decoding: input[start..<index], as: UTF8.self)
                    let range = NSRange(location: 0, length: token.utf16.count)
                    guard numberSyntax.firstMatch(in: token, range: range)?.range == range,
                          let number = Double(token), number.isFinite else {
                        throw VexillaError("validation", "Invalid finite JSON number")
                    }
                    // This private key is outside the base64 alphabet, so it
                    // cannot collide with any encoded input property.
                    encoded += "{\"!number\":\(numbers.count)}".utf8
                    numbers.append(number)
                    continue
                }
                if input[index] != 34 { encoded.append(input[index]); index += 1; continue }
                let start = index
                index += 1
                while index < input.count && input[index] != 34 {
                    if input[index] == 92 { index += 1 }
                    index += 1
                }
                guard index < input.count else { throw VexillaError("validation", "Unterminated JSON string") }
                index += 1
                let token = Data(input[start..<index])
                let text = try stringDecoder.decode(String.self, from: token)
                var next = index
                while next < input.count && [9, 10, 13, 32].contains(input[next]) { next += 1 }
                if next < input.count && input[next] == 58 {
                    encoded += try stringEncoder.encode(Data(text.utf8).base64EncodedString())
                } else { encoded += token }
            }
            return try fromEncoded(JSONSerialization.jsonObject(with: Data(encoded), options: [.fragmentsAllowed]), numbers)
        } catch let error as VexillaError { throw error }
        catch { throw VexillaError("validation", "Invalid v1 JSON: \(error)") }
    }
    private static func fromEncoded(_ value: Any, _ numbers: [Double]) throws -> Wire {
        if let marker = value as? [String: Any], marker.count == 1, let index = marker["!number"] as? NSNumber {
            guard numbers.indices.contains(index.intValue) else { throw VexillaError("validation", "Invalid numeric marker") }
            return .number(numbers[index.intValue])
        }
        if value is NSNull { return .null }
        if let text = value as? String { return .string(text) }
        if let number = value as? NSNumber {
            if CFGetTypeID(number) == CFBooleanGetTypeID() { return .bool(number.boolValue) }
            guard number.doubleValue.isFinite else { throw VexillaError("validation", "Nonfinite JSON number") }
            return .number(number.doubleValue)
        }
        if let array = value as? [Any] { return .array(try array.map { try fromEncoded($0,numbers) }) }
        guard let object = value as? [String: Any] else { throw VexillaError("validation", "Unsupported JSON value") }
        var fields = StringMap<Wire>()
        for (key, item) in object {
            guard let bytes = Data(base64Encoded: key), let name = String(data: bytes, encoding: .utf8) else {
                throw VexillaError("validation", "Invalid encoded JSON key")
            }
            fields[name] = try fromEncoded(item,numbers)
        }
        return .object(fields)
    }
    func encoded() throws -> Data {
        var output: [UInt8] = []
        let stringEncoder = JSONEncoder()
        func write(_ value: Wire) throws {
            switch value {
            case let .string(text): output += try stringEncoder.encode(text)
            case let .number(number):
                guard number.isFinite else { throw VexillaError("validation", "Nonfinite native number") }
                let text = number.rounded(.towardZero) == number && abs(number) <= 9007199254740991
                    ? String(Int64(number)) : String(number)
                output += text.utf8
            case let .bool(value): output += (value ? "true" : "false").utf8
            case .null: output += "null".utf8
            case let .array(array):
                output.append(91)
                for (i, item) in array.enumerated() { if i > 0 { output.append(44) }; try write(item) }
                output.append(93)
            case let .object(fields):
                output.append(123)
                for (i, entry) in fields.enumerated() {
                    if i > 0 { output.append(44) }
                    try write(.string(entry.key)); output.append(58); try write(entry.value)
                }
                output.append(125)
            }
        }
        try write(self)
        return Data(output)
    }
}
