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

extension Schedule {
  init(fromDict: [String: Any]) throws {
    start = try safeGet(dict: fromDict, key: "start")
    end = try safeGet(dict: fromDict, key: "end")
    timezone = try safeGet(dict: fromDict, key: "timezone")
    let _timeType: String = try safeGet(dict: fromDict, key: "timeType")
    timeType = try ScheduleTimeType(rawValue: _timeType)
    startTime = try safeGet(dict: fromDict, key: "startTime")
    endTime = try safeGet(dict: fromDict, key: "endTime")
  }
}

public struct GroupMeta: Decodable {
  let version: String
}

extension GroupMeta {
  init(fromDict: [String: Any]) throws {
    version = try safeGet(dict: fromDict, key: "version")
  }
}

protocol BaseFeature: Decodable {
  var name: String { get }
  var featureId: String { get }
  var featureType: FeatureType { get }
  var scheduleType: ScheduleType { get }
  var schedule: Schedule { get }
}

public struct Feature: BaseFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType
  public let scheduleType: ScheduleType
  public let schedule: Schedule

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)
  }
}

public struct ToggleFeature: BaseFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .toggle
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let value: Bool

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    value = try safeGet(dict: fromDict, key: "value")
  }
}

public struct GradualFeature: BaseFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .gradual
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let value: Float64
  public let seed: Float64

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    value = try safeGet(dict: fromDict, key: "value")
    seed = try safeGet(dict: fromDict, key: "seed")
  }
}

protocol BaseSelectiveFeature: BaseFeature {
  var valueType: ValueType { get }
}

public struct SelectiveFeature: BaseSelectiveFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let valueType: ValueType

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)
  }
}

public struct SelectiveStringFeature: BaseSelectiveFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .string
  public let value: [String]

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)
    value = try safeGet(dict: fromDict, key: "value")
  }
}

protocol BaseSelectiveNumberFeature: BaseSelectiveFeature {
  var numberType: NumberType { get }
}

public struct SelectiveNumberFeature: BaseSelectiveNumberFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .number
  public let numberType: NumberType

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)
    let _numberType: String = try safeGet(dict: fromDict, key: "numberType")
    numberType = try NumberType(rawValue: _numberType)
  }
}

public struct SelectiveIntFeature: BaseSelectiveNumberFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .number
  public var numberType: NumberType = .int
  public let value: [Int64]

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)

    let _numberType: String = try safeGet(dict: fromDict, key: "numberType")
    numberType = try NumberType(rawValue: _numberType)
    value = try safeGet(dict: fromDict, key: "value")
  }
}

public struct SelectiveFloatFeature: BaseSelectiveNumberFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .number
  public var numberType: NumberType = .float
  public let value: [Float64]

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)

    let _numberType: String = try safeGet(dict: fromDict, key: "numberType")
    numberType = try NumberType(rawValue: _numberType)
    value = try safeGet(dict: fromDict, key: "value")
  }
}

protocol BaseValueFeature: BaseFeature {
  var valueType: ValueType { get }
}

public struct ValueFeature: BaseValueFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public let valueType: ValueType

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)
  }
}

public struct ValueStringFeature: BaseValueFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .string
  public let value: String

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)
    value = try safeGet(dict: fromDict, key: "value")
  }
}

protocol BaseValueNumberFeature: BaseValueFeature {
  var numberType: NumberType { get }
}

public struct ValueNumberFeature: BaseValueNumberFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .number
  public let numberType: NumberType

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)

    let _numberType: String = try safeGet(dict: fromDict, key: "numberType")
    numberType = try NumberType(rawValue: _numberType)
  }
}

public struct ValueIntFeature: BaseValueNumberFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .number
  public var numberType: NumberType = .int
  public let value: Int64

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)

    let _numberType: String = try safeGet(dict: fromDict, key: "numberType")
    numberType = try NumberType(rawValue: _numberType)
    value = try safeGet(dict: fromDict, key: "value")
  }
}

public struct ValueFloatFeature: BaseValueNumberFeature {
  public let name: String
  public let featureId: String
  public var featureType: FeatureType = .selective
  public let scheduleType: ScheduleType
  public let schedule: Schedule
  public var valueType: ValueType = .number
  public var numberType: NumberType = .float
  public let value: Float64

  init(fromDict: [String: Any]) throws {
    name = try safeGet(dict: fromDict, key: "name")
    featureId = try safeGet(dict: fromDict, key: "featureId")
    let _featureType: String = try safeGet(dict: fromDict, key: "featureType")
    featureType = try FeatureType(rawValue: _featureType)
    let _scheduleType: String = try safeGet(dict: fromDict, key: "scheduleType")
    scheduleType = try ScheduleType(rawValue: _scheduleType)
    let rawSchedule: [String: Any] = try safeGet(dict: fromDict, key: "schedule")
    schedule = try Schedule(fromDict: rawSchedule)

    let _valueType: String = try safeGet(dict: fromDict, key: "valueType")
    valueType = try ValueType(rawValue: _valueType)

    let _numberType: String = try safeGet(dict: fromDict, key: "numberType")
    numberType = try NumberType(rawValue: _numberType)
    value = try safeGet(dict: fromDict, key: "value")
  }
}

public struct ManifestGroup: Decodable {
  public let name: String
  public let groupId: String
}

public struct Manifest: Decodable {
  public let version: String
  public let groups: [ManifestGroup]
}

public struct Environment {
  public let name: String
  public let environmentId: String
  public let rawFeatures: [String: Feature]

  let toggleFeatures: [String: ToggleFeature]
  let gradualFeatures: [String: GradualFeature]

  let selectiveFeatures: [String: SelectiveFeature]
  let selectiveStringFeatures: [String: SelectiveStringFeature]
  let selectiveNumberFeatures: [String: SelectiveNumberFeature]
  let selectiveIntFeatures: [String: SelectiveIntFeature]
  let selectiveFloatFeatures: [String: SelectiveFloatFeature]

  let valueFeatures: [String: ValueFeature]
  let valueStringFeatures: [String: ValueStringFeature]
  let valueNumberFeatures: [String: ValueNumberFeature]
  let valueIntFeatures: [String: ValueIntFeature]
  let valueFloatFeatures: [String: ValueFloatFeature]

  init(fromDict: [String: Any]) throws {
    // let data = try JSONSerialization.jsonObject(with: Data(json.utf8), options: .allowFragments) as? [String: Any]

    name = try safeGet(dict: fromDict, key: "name")
    environmentId = try safeGet(dict: fromDict, key: "environmentId")

    let _features: [String: [String: Any]] = try safeGet(dict: fromDict, key: "features")

    var _rawFeatures: [String: Feature] = [:]

    var _toggleFeatures: [String: ToggleFeature] = [:]
    var _gradualFeatures: [String: GradualFeature] = [:]

    var _selectiveFeatures: [String: SelectiveFeature] = [:]
    var _selectiveStringFeatures: [String: SelectiveStringFeature] = [:]
    var _selectiveNumberFeatures: [String: SelectiveNumberFeature] = [:]
    var _selectiveIntFeatures: [String: SelectiveIntFeature] = [:]
    var _selectiveFloatFeatures: [String: SelectiveFloatFeature] = [:]

    var _valueFeatures: [String: ValueFeature] = [:]
    var _valueStringFeatures: [String: ValueStringFeature] = [:]
    var _valueNumberFeatures: [String: ValueNumberFeature] = [:]
    var _valueIntFeatures: [String: ValueIntFeature] = [:]
    var _valueFloatFeatures: [String: ValueFloatFeature] = [:]

    for (key, value) in _features {
      let rawFeature = try Feature(fromDict: value)
      _rawFeatures[key] = rawFeature

      switch rawFeature.featureType {
      case .toggle:
        let toggleFeature = try ToggleFeature(fromDict: value)
        _toggleFeatures[key] = toggleFeature
      case .gradual:
        let gradualFeature = try GradualFeature(fromDict: value)
        _gradualFeatures[key] = gradualFeature
      case .selective:
        let selectiveFeature = try SelectiveFeature(fromDict: value)
        _selectiveFeatures[key] = selectiveFeature

        switch selectiveFeature.valueType {
        case .string:
          let selectiveStringFeature = try SelectiveStringFeature(fromDict: value)
          _selectiveStringFeatures[key] = selectiveStringFeature

        case .number:
          let selectiveNumberFeature = try SelectiveNumberFeature(fromDict: value)
          _selectiveNumberFeatures[key] = selectiveNumberFeature

          switch selectiveNumberFeature.numberType {
          case .int:
            let selectiveIntFeature = try SelectiveIntFeature(fromDict: value)
            _selectiveIntFeatures[key] = selectiveIntFeature

          case .float:
            let selectiveFloatFeature = try SelectiveFloatFeature(fromDict: value)
            _selectiveFloatFeatures[key] = selectiveFloatFeature
          }
        }

      case .value:
        let valueFeature = try ValueFeature(fromDict: value)
        _valueFeatures[key] = valueFeature

        switch valueFeature.valueType {
        case .string:
          let valueStringFeature = try ValueStringFeature(fromDict: value)
          _valueStringFeatures[key] = valueStringFeature

        case .number:
          let valueNumberFeature = try ValueNumberFeature(fromDict: value)
          _valueNumberFeatures[key] = valueNumberFeature

          switch valueNumberFeature.numberType {
          case .int:
            let valueIntFeature = try ValueIntFeature(fromDict: value)
            _valueIntFeatures[key] = valueIntFeature

          case .float:
            let valueFloatFeature = try ValueFloatFeature(fromDict: value)
            _valueFloatFeatures[key] = valueFloatFeature
          }
        }
      }
    }

    rawFeatures = _rawFeatures

    toggleFeatures = _toggleFeatures
    gradualFeatures = _gradualFeatures

    selectiveFeatures = _selectiveFeatures
    selectiveStringFeatures = _selectiveStringFeatures
    selectiveNumberFeatures = _selectiveNumberFeatures
    selectiveIntFeatures = _selectiveIntFeatures
    selectiveFloatFeatures = _selectiveFloatFeatures

    valueFeatures = _valueFeatures
    valueStringFeatures = _valueStringFeatures
    valueNumberFeatures = _valueNumberFeatures
    valueIntFeatures = _valueIntFeatures
    valueFloatFeatures = _valueFloatFeatures
  }
}

public struct Group {
  public let name: String
  public let groupId: String
  public let meta: GroupMeta
  public let environments: [String: Environment]
  public let features: [String: Feature]

  init(json: String) throws {
    // Maybe have a separate assertion here if the jsonObject function fails
    let data = try JSONSerialization.jsonObject(with: Data(json.utf8), options: .allowFragments) as? [String: Any]

    name = try safeGet(dict: data, key: "name")
    groupId = try safeGet(dict: data, key: "groupId")

    let _groupMeta: [String: Any] = try safeGet(dict: data, key: "meta")
    let metaVersion: String = try safeGet(dict: _groupMeta, key: "version")
    meta = GroupMeta(version: metaVersion)

    var _environments: [String: Environment] = [:]
    let _rawEnvironments: [String: [String: Any]] = try safeGet(dict: data, key: "environments")
    for (key, value) in _rawEnvironments {
      _environments[key] = try Environment(fromDict: value)
    }

    environments = _environments

    var _features: [String: Feature] = [:]
    let _rawFeatures: [String: [String: Any]] = try safeGet(dict: data, key: "features")
    for (key, value) in _rawFeatures {
      _features[key] = try Feature(fromDict: value)
    }

    features = _features
  }
}
