import Foundation

enum Validation {
    static func require(_ value: Bool, _ message: String) throws {
        if !value { throw VexillaError("validation", message) }
    }
    private static func member(_ value: Wire, _ allowed: [String]) throws {
        let text = try value.text()
        try require(allowed.contains(where: { exact($0, text) }), "Unsupported enum")
    }
    private static func safeID(_ value: Wire) throws -> String {
        let identifier = try value.text(true)
        try require(
            !["manifest", "config", ".", ".."].contains(where: { exact($0, identifier) })
                && !identifier.unicodeScalars.contains(where: { [0, 47, 92].contains($0.value) }),
            "Unsafe group file identifier")
        return identifier
    }
    static func addAlias(_ aliases: inout StringMap<String>, _ identifier: String, _ name: String)
        throws
    {
        for key in [identifier, name, try Compatibility.normalize(name)] {
            try require(
                aliases[key] == nil || exact(aliases[key]!, identifier),
                "Alias shadows another ID/name")
            aliases[key] = identifier
        }
    }
    static func schedule(_ value: Wire) throws {
        _ = try value.object()
        for key in ["start", "end", "startTime", "endTime"] { _ = try value[key].number(true) }
        try member(value["timeType"], ["none", "start/end", "daily"])
        try require(Compatibility.timezone(value["timezone"].text(true)), "Invalid timezone")
    }
    static func feature(_ value: Wire) throws {
        _ = try value.object()
        _ = try value["name"].text()
        _ = try value["featureId"].text(true)
        try member(value["scheduleType"], ["", "global", "environment"])
        try schedule(value["schedule"])
        let kind = try value["featureType"].text()
        switch kind {
        case "toggle":
            guard case .bool = value["value"] else {
                throw VexillaError("validation", "Toggle value must be boolean")
            }
        case "gradual":
            _ = try value["value"].number()
            let seed = try value["seed"].number()
            try require(seed > 0 && seed <= 1, "seed must satisfy 0 < seed <= 1")
        case "selective", "value":
            try member(value["valueType"], ["string", "number"])
            let numeric = try value["valueType"].text() == "number"
            if numeric { try member(value["numberType"], ["int", "float"]) }
            let integer = try numeric && value["numberType"].text() == "int"
            func item(_ value: Wire) throws {
                if numeric { _ = try value.number(integer) } else { _ = try value.text() }
            }
            if kind == "selective" {
                for value in try value["value"].array() { try item(value) }
            } else {
                try item(value["value"])
            }
        default: throw VexillaError("validation", "Unknown featureType")
        }
    }
    private static func features(_ value: Wire) throws -> StringMap<Wire> {
        let fields = try value.object()
        var aliases = StringMap<String>()
        for item in fields {
            try feature(item.value)
            try require(
                exact(item.key, item.value["featureId"].text(true)),
                "featureId differs from map key")
            try addAlias(&aliases, item.key, item.value["name"].text())
        }
        return fields
    }
    static func manifest(_ value: Wire) throws {
        _ = try value.object()
        try require(value["version"].text() == "v1", "Manifest version must be v1")
        var ids = Set<Data>()
        var aliases = StringMap<String>()
        for group in try value["groups"].array() {
            let identifier = try safeID(group["groupId"])
            try require(ids.insert(Data(identifier.utf8)).inserted, "Duplicate group ID")
            try addAlias(&aliases, identifier, group["name"].text())
        }
    }
    private static func samePrimitive(_ leftValue: Wire?, _ rightValue: Wire?) -> Bool {
        switch (leftValue, rightValue) {
        case (nil, nil), (.null?, .null?): return true
        case let (.string(leftValue)?, .string(rightValue)?): return exact(leftValue, rightValue)
        case let (.number(leftValue)?, .number(rightValue)?): return leftValue == rightValue
        case let (.bool(leftValue)?, .bool(rightValue)?): return leftValue == rightValue
        default: return false
        }
    }
    static func group(_ value: Wire) throws {
        _ = try value.object()
        _ = try safeID(value["groupId"])
        _ = try value["name"].text()
        _ = try value["meta"].object()
        try require(value["meta"]["version"].text() == "v1", "Group version must be v1")
        let defaults = try features(value["features"])
        var aliases = StringMap<String>()
        for env in try value["environments"].object() {
            _ = try env.value.object()
            try require(
                exact(env.key, env.value["environmentId"].text(true)),
                "environmentId differs from map key")
            try addAlias(&aliases, env.key, env.value["name"].text())
            let values = try features(env.value["features"])
            try require(defaults.count == values.count, "Environment feature set differs")
            for item in values {
                guard let original = defaults[item.key] else {
                    throw VexillaError("validation", "Unknown environment feature")
                }
                let leftValue = try item.value.object()
                let rightValue = try original.object()
                for key in ["name", "featureType", "valueType", "numberType"] {
                    try require(
                        samePrimitive(leftValue[key], rightValue[key]),
                        "Environment feature identity/subtype differs")
                }
            }
        }
    }
}
extension Schedule {
    public static func decode(data: Data) throws -> Schedule { try decoded(Wire.decode(data)) }
    static func decoded(_ value: Wire) throws -> Schedule {
        try Validation.schedule(value)
        guard let mode = ScheduleTimeType(rawValue: try value["timeType"].text()) else {
            throw VexillaError("validation", "Unknown timeType")
        }
        return Schedule(
            start: Int(try value["start"].number(true)), end: Int(try value["end"].number(true)),
            timezone: try value["timezone"].text(), timeType: mode,
            startTime: Int(try value["startTime"].number(true)),
            endTime: Int(try value["endTime"].number(true)))
    }
    var wire: Wire {
        .object([
            "start": .number(Double(start)), "end": .number(Double(end)),
            "timezone": .string(timezone), "timeType": .string(timeType.rawValue),
            "startTime": .number(Double(startTime)), "endTime": .number(Double(endTime)),
        ])
    }
}
extension Feature {
    static func decoded(_ value: Wire) throws -> Feature {
        try Validation.feature(value)
        let name = try value["name"].text()
        let identifier = try value["featureId"].text()
        guard let mode = ScheduleType(rawValue: try value["scheduleType"].text()) else {
            throw VexillaError("validation", "Unknown scheduleType")
        }
        let schedule = try Schedule.decoded(value["schedule"])
        switch try value["featureType"].text() {
        case "toggle":
            guard case let .bool(flag) = value["value"] else {
                throw VexillaError("validation", "Invalid toggle")
            }
            return .toggle(
                ToggleFeature(
                    name: name, featureId: identifier, scheduleType: mode, schedule: schedule,
                    value: flag))
        case "gradual":
            return .gradual(
                GradualFeature(
                    name: name, featureId: identifier, scheduleType: mode, schedule: schedule,
                    value: try value["value"].number(), seed: try value["seed"].number()))
        case "selective":
            let values = try value["value"].array()
            let selected: SelectiveFeature.Value
            if try value["valueType"].text() == "string" {
                selected = .string(try values.map { try $0.text() })
            } else if try value["numberType"].text() == "int" {
                selected = .int(try values.map { Int64(try $0.number(true)) })
            } else {
                selected = .float(try values.map { try $0.number() })
            }
            return .selective(
                SelectiveFeature(
                    name: name, featureId: identifier, scheduleType: mode, schedule: schedule,
                    value: selected))
        default:
            let selected: ValueFeature.Value
            if try value["valueType"].text() == "string" {
                selected = .string(try value["value"].text())
            } else if try value["numberType"].text() == "int" {
                selected = .int(Int64(try value["value"].number(true)))
            } else {
                selected = .float(try value["value"].number())
            }
            return .value(
                ValueFeature(
                    name: name, featureId: identifier, scheduleType: mode, schedule: schedule,
                    value: selected))
        }
    }
    var wire: Wire {
        var data: StringMap<Wire> = [
            "name": .string(name), "featureId": .string(featureId),
            "featureType": .string(featureType.rawValue),
            "scheduleType": .string(scheduleType.rawValue), "schedule": schedule.wire,
        ]
        switch self {
        case let .toggle(featureDetails): data["value"] = .bool(featureDetails.value)
        case let .gradual(featureDetails):
            data["value"] = .number(featureDetails.value)
            data["seed"] = .number(featureDetails.seed)
        case let .selective(featureDetails):
            switch featureDetails.value {
            case let .string(v):
                data["valueType"] = .string("string")
                data["value"] = .array(v.map { .string($0) })
            case let .int(v):
                data["valueType"] = .string("number")
                data["numberType"] = .string("int")
                data["value"] = .array(v.map { .number(Double($0)) })
            case let .float(v):
                data["valueType"] = .string("number")
                data["numberType"] = .string("float")
                data["value"] = .array(v.map { .number($0) })
            }
        case let .value(featureDetails):
            switch featureDetails.value {
            case let .string(v):
                data["valueType"] = .string("string")
                data["value"] = .string(v)
            case let .int(v):
                data["valueType"] = .string("number")
                data["numberType"] = .string("int")
                data["value"] = .number(Double(v))
            case let .float(v):
                data["valueType"] = .string("number")
                data["numberType"] = .string("float")
                data["value"] = .number(v)
            }
        }
        return .object(data)
    }
}
extension Manifest {
    var wire: Wire {
        .object([
            "version": .string(version),
            "groups": .array(
                groups.map { .object(["name": .string($0.name), "groupId": .string($0.groupId)]) }),
        ])
    }
}
extension Group {
    var wire: Wire {
        func features(_ value: StringMap<Feature>) -> Wire {
            .object(StringMap(value.map { ($0.key, $0.value.wire) }))
        }
        return .object([
            "groupId": .string(groupId), "name": .string(name),
            "meta": .object(["version": .string(meta.version)]),
            "features": features(self.features),
            "environments": .object(
                StringMap(
                    environments.map { item in
                        (
                            item.key,
                            .object([
                                "name": .string(item.value.name),
                                "environmentId": .string(item.value.environmentId),
                                "features": features(item.value.features),
                            ])
                        )
                    })),
        ])
    }
}
