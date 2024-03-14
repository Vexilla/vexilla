import Foundation

// TODO: Make a proper Error enum for VexillaClient
extension String: Error {}

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

  public init(from decoder: any Decoder) throws {
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

  public init(from decoder: any Decoder) throws {
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

  public init(from decoder: any Decoder) throws {
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

public struct Manifest: Decodable {
  public let version: String
  public let groups: [ManifestGroup]
}

public struct Environment: Decodable {
  public let name: String
  public let environmentId: String
  public let features: [String: Feature]
}

public struct Group: Decodable {
  public let name: String
  public let groupId: String
  public let meta: GroupMeta
  public let environments: [String: Environment]
  public let features: [String: Feature]
}
