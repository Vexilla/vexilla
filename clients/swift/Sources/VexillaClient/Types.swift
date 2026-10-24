import Foundation

enum VexillaClientError: Error {
  case couldNotConstructUrl
  case couldNotFindKeyInLookupTable(tableName: String, nameOrId: String)
  case couldNotFindKeyInNestedLookupTable(tableName: String, groupId: String, nameOrId: String)
  case invalidFeatureTypeError(functionName: String, featureType: String)
  case invalidFeatureValueTypeError(functionName: String, valueType: String, otherFunctionsString: String)
  case invalidFeatureNumberTypeError(functionName: String, numberType: String, otherFunctionsString: String)
}

extension VexillaClientError: LocalizedError {
  var errorDescription: String? {
    switch self {
    case .couldNotConstructUrl:
      return NSLocalizedString(
        "The url could not be constructed with the arguments passed to it.",
        comment: ""
      )
    case let .couldNotFindKeyInLookupTable(tableName: tableName, nameOrId: nameOrId):
      let format = NSLocalizedString(
        "%@ ID (%@) not found in lookup table. Did you fetch and set the manifest, yet?",
        comment: ""
      )
      return String(format: format, String(tableName), String(nameOrId))

    case let .couldNotFindKeyInNestedLookupTable(tableName: tableName, groupId: groupId, nameOrId: nameOrId):

      let format = NSLocalizedString(
        "%@ ID (%@) not found in lookup table. Did you fetch and set the manifest, yet?",
        comment: ""
      )
      return String(format: format, String(tableName), String(groupId), String(nameOrId))

    case let .invalidFeatureTypeError(
      functionName: functionName,
      featureType: featureType
    ):
      let format = NSLocalizedString(
        "%@ must only be called on features with featureType of '%@'",
        comment: ""
      )
      return String(format: format, String(functionName), String(featureType))

    case let .invalidFeatureValueTypeError(functionName: functionName, valueType: valueType, otherFunctionsString: otherFunctionsString):
      let format = NSLocalizedString(
        "%@ must only be called for features with a valueType of '%@'. Try %@",
        comment: ""
      )
      return String(format: format, String(functionName), String(valueType), String(otherFunctionsString))
    case let .invalidFeatureNumberTypeError(functionName: functionName, numberType: numberType, otherFunctionsString: otherFunctionsString):
      let format = NSLocalizedString(
        "%@ must only be called for features with a numberType of '%@'. Try %@",
        comment: ""
      )
      return String(format: format, String(functionName), String(numberType), String(otherFunctionsString))
    }
  }
}

enum VexillaSchedulingError: Error {
  case couldNotCreateUTCTimezone
  case couldNotAddDayToEndDate
}

enum VexillaDecodingError: Error {
  case couldNotDecodeRawValue(expectedType: Any.Type)
}

extension RawRepresentable {
  init(rawValue: RawValue) throws {
    if let result = Self(rawValue: rawValue) {
      self = result
    } else {
      throw VexillaDecodingError.couldNotDecodeRawValue(expectedType: Self.self)
    }
  }
}

public enum FeatureType: String, Decodable {
  case gradual
  case toggle
  case selective
  case value
}

public enum ScheduleType: String, Decodable {
  case empty = ""
  case global
  case environment
}

public enum ScheduleTimeType: String, Decodable {
  case none
  case startEnd = "start/end"
  case daily
}

public enum ValueType: String, Decodable {
  case string
  case number
}

public enum NumberType: String, Decodable {
  case int
  case float
}

public struct Schedule: Decodable {
  let start: Int
  let end: Int
  let timezone: String
  let timeType: ScheduleTimeType
  let startTime: Int
  let endTime: Int
}

public struct GroupMeta: Decodable {
  let version: String
}

protocol BaseFeature: Decodable {
  var name: String { get }
  var featureId: String { get }
  var featureType: FeatureType { get }
  var scheduleType: ScheduleType { get }
  var schedule: Schedule { get }
}

public enum Feature: Decodable, BaseFeature {
  private enum CodingKeys: String, CodingKey {
    case featureType
  }

  case toggle(ToggleFeature)
  case gradual(GradualFeature)
  case selective(SelectiveFeature)
  case value(ValueFeature)

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    let featureType = try container.decode(FeatureType.self, forKey: .featureType)

    switch featureType {
    case .toggle:
      self = try .toggle(ToggleFeature(from: decoder))
    case .gradual:
      self = try .gradual(GradualFeature(from: decoder))
    case .selective:
      self = try .selective(SelectiveFeature(from: decoder))
    case .value:
      self = try .value(ValueFeature(from: decoder))
    }
  }

  // MARK: Helpful accessors for both internal and public use

  public var name: String {
    switch self {
    case let .toggle(feature):
      return feature.name
    case let .gradual(feature):
      return feature.name
    case let .selective(feature):
      return feature.name
    case let .value(feature):
      return feature.name
    }
  }

  public var featureId: String {
    switch self {
    case let .toggle(feature):
      return feature.featureId
    case let .gradual(feature):
      return feature.featureId
    case let .selective(feature):
      return feature.featureId
    case let .value(feature):
      return feature.featureId
    }
  }

  public var featureType: FeatureType {
    switch self {
    case .toggle:
      return .toggle
    case .gradual:
      return .gradual
    case .selective:
      return .selective
    case .value:
      return .value
    }
  }

  public var scheduleType: ScheduleType {
    switch self {
    case let .toggle(feature):
      return feature.scheduleType
    case let .gradual(feature):
      return feature.scheduleType
    case let .selective(feature):
      return feature.scheduleType
    case let .value(feature):
      return feature.scheduleType
    }
  }

  public var schedule: Schedule {
    switch self {
    case let .toggle(feature):
      return feature.schedule
    case let .gradual(feature):
      return feature.schedule
    case let .selective(feature):
      return feature.schedule
    case let .value(feature):
      return feature.schedule
    }
  }
}

public struct ToggleFeature: BaseFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType { .toggle }
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let value: Bool
}

public struct GradualFeature: BaseFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType { .gradual }
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let value: Float64
  public let seed: Float64

  private enum CodingKeys: String, CodingKey {
    case name, featureId, scheduleType, schedule, value, seed
  }

  init(name: String, featureId: String, scheduleType: ScheduleType, schedule: Schedule, value: Float64, seed: Float64) {
    self.name = name; self.featureId = featureId; self.scheduleType = scheduleType; self.schedule = schedule; self.value = value
    self.seed = seed
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    name = try container.decode(String.self, forKey: .name)
    featureId = try container.decode(String.self, forKey: .featureId)
    scheduleType = try container.decode(ScheduleType.self, forKey: .scheduleType)
    schedule = try container.decode(Schedule.self, forKey: .schedule)
    value = try container.decode(Float64.self, forKey: .value)
    seed = try container.decode(Float64.self, forKey: .seed)
    guard seed.isFinite && seed > 0 && seed <= 1 else {
      throw DecodingError.dataCorruptedError(forKey: .seed, in: container,
        debugDescription: "seed must be a finite number greater than 0 and less than or equal to 1")
    }
  }
}

public struct SelectiveFeature: BaseFeature {
  private enum CodingKeys: String, CodingKey {
    case name, featureId, scheduleType, schedule, valueType, numberType, value
  }

  public enum Value {
    case string([String])
    case int([Int64])
    case float([Float64])
  }

  init(name: String, featureId: String, scheduleType: ScheduleType, schedule: Schedule, value: Value) {
    self.name = name; self.featureId = featureId; self.scheduleType = scheduleType; self.schedule = schedule; self.value = value
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    name = try container.decode(String.self, forKey: .name)
    featureId = try container.decode(String.self, forKey: .featureId)
    scheduleType = try container.decode(ScheduleType.self, forKey: .scheduleType)
    schedule = try container.decode(Schedule.self, forKey: .schedule)
    let valueType = try container.decode(ValueType.self, forKey: .valueType)

    switch valueType {
    case .string:
      let value = try container.decode([String].self, forKey: .value)
      self.value = .string(value)
    case .number:
      let numberType = try container.decode(NumberType.self, forKey: .numberType)
      switch numberType {
      case .int:
        let value = try container.decode([Int64].self, forKey: .value)
        self.value = .int(value)
      case .float:
        let value = try container.decode([Float64].self, forKey: .value)
        self.value = .float(value)
      }
    }
  }

  public let name: String
  public let featureId: String
  public var featureType: FeatureType { .selective }
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let value: Value
}

public struct ValueFeature: BaseFeature {
  private enum CodingKeys: String, CodingKey {
    case name, featureId, scheduleType, schedule, valueType, numberType, value
  }

  public enum Value {
    case string(String)
    case int(Int64)
    case float(Float64)
  }

  init(name: String, featureId: String, scheduleType: ScheduleType, schedule: Schedule, value: Value) {
    self.name = name; self.featureId = featureId; self.scheduleType = scheduleType; self.schedule = schedule; self.value = value
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    name = try container.decode(String.self, forKey: .name)
    featureId = try container.decode(String.self, forKey: .featureId)
    scheduleType = try container.decode(ScheduleType.self, forKey: .scheduleType)
    schedule = try container.decode(Schedule.self, forKey: .schedule)
    let valueType = try container.decode(ValueType.self, forKey: .valueType)

    switch valueType {
    case .string:
      let value = try container.decode(String.self, forKey: .value)
      self.value = .string(value)
    case .number:
      let numberType = try container.decode(NumberType.self, forKey: .numberType)
      switch numberType {
      case .int:
        let value = try container.decode(Int64.self, forKey: .value)
        self.value = .int(value)
      case .float:
        let value = try container.decode(Float64.self, forKey: .value)
        self.value = .float(value)
      }
    }
  }

  public let name: String
  public let featureId: String
  public var featureType: FeatureType { .value }
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let value: Value
}

public struct ManifestGroup: Decodable {
  public let name: String
  public let groupId: String
}

public struct Manifest {
  public let version: String
  public let groups: [ManifestGroup]
}

public struct Environment {
  public let name: String
  public let environmentId: String
  public let features: StringMap<Feature>
}

public struct Group {
  public let name: String
  public let groupId: String
  public let meta: GroupMeta
  public let environments: StringMap<Environment>
  public let features: StringMap<Feature>
}

// Use these byte-preserving factories rather than Foundation's normalization
// of object keys during aggregate model decoding.
extension Manifest {
    public static func decode(data: Data) throws -> Manifest {
        let wire = try Wire.decode(data)
        try Validation.manifest(wire)
        return Manifest(version: try wire["version"].text(), groups: try wire["groups"].array().map {
            ManifestGroup(name: try $0["name"].text(), groupId: try $0["groupId"].text())
        })
    }
}
extension Group {
    public static func decode(data: Data) throws -> Group {
        let wire = try Wire.decode(data)
        try Validation.group(wire)
        func features(_ value: Wire) throws -> StringMap<Feature> {
            var result = StringMap<Feature>()
            for entry in try value.object() {
                result[entry.key] = try Feature.decoded(entry.value)
            }
            return result
        }
        var environments = StringMap<Environment>()
        for entry in try wire["environments"].object() {
            environments[entry.key] = Environment(name: try entry.value["name"].text(),
                environmentId: try entry.value["environmentId"].text(), features: try features(entry.value["features"]))
        }
        return Group(name: try wire["name"].text(), groupId: try wire["groupId"].text(),
            meta: GroupMeta(version: try wire["meta"]["version"].text()), environments: environments,
            features: try features(wire["features"]))
    }
}
