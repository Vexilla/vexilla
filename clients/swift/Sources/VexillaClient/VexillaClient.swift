import Foundation

@available(macOS 10.15.0, *)
public struct VexillaClient {
    private let environment: String
    private let baseUrl: String
    private let instanceId: String

    private var manifest: Manifest?
    private var flagGroups: [String: Group] = [:]

    private var groupLookupTable: [String: String] = [:]
    private var environmentLookupTable: [String: [String: String]] = [:]
    private var featureLookupTable: [String: [String: String]] = [:]

    public init(environment: String, baseUrl: String, instanceId: String) {
        self.environment = environment
        self.baseUrl = baseUrl
        self.instanceId = instanceId
    }

    public func getManifest(fetch: (String) async throws -> String) async throws -> Manifest {
        let url = "\(baseUrl)/manifest.json"
        let response = try await fetch(url)

        // print("getManifest Response", response.utf8)
        let responseData = Data(response.utf8)
        let manifest = try JSONDecoder().decode(Manifest.self, from: responseData)
        return manifest
    }

    public mutating func setManifest(manifest: Manifest) {
        self.manifest = manifest

        var _groupLookupTable: [String: String] = [:]
        for group in manifest.groups {
            _groupLookupTable[group.name] = group.groupId
            _groupLookupTable[group.groupId] = group.groupId
        }

        groupLookupTable = _groupLookupTable
    }

    public mutating func syncManifest(fetch: (String) async throws -> String) async throws {
        let manifest = try await getManifest(fetch: fetch)
        setManifest(manifest: manifest)
    }

    public func getFlags(groupNameOrId: String, fetch: (String) async throws -> String) async throws -> Group {
        let groupId: String = try safeGet(dict: groupLookupTable, key: groupNameOrId, errorMessage: "Group ID (\(groupNameOrId)) not found in lookup table. Did you fetch and set the manifest, yet?")
        let url = "\(baseUrl)/\(groupId).json"
        let response = try await fetch(url)
        // let responseData = Data(response.utf8)
        do {
            // let group = try JSONDecoder().decode(Group.self, from: responseData)
            let group = try Group(json: response)
            return group
        } catch {
            print("GROUP ERROR", error)
            throw error
        }
    }

    public mutating func setFlags(groupNameOrId: String, group: Group) throws {
        let groupId: String = try safeGet(dict: groupLookupTable, key: groupNameOrId, errorMessage: "Group ID (\(groupNameOrId)) not found in lookup table. Did you fetch and set the manifest, yet?")

        flagGroups[groupId] = group

        if environmentLookupTable[groupId] == nil {
            environmentLookupTable[groupId] = [:]
        }
        for (_, environment) in group.environments {
            environmentLookupTable[groupId]?[environment.name] = environment.environmentId
            environmentLookupTable[groupId]?[environment.environmentId] = environment.environmentId
        }

        if featureLookupTable[groupId] == nil {
            featureLookupTable[groupId] = [:]
        }
        for (_, feature) in group.features {
            featureLookupTable[groupId]?[feature.name] = feature.featureId
            featureLookupTable[groupId]?[feature.featureId] = feature.featureId
        }
    }

    public mutating func syncFlags(groupNameOrId: String, fetch: (String) async throws -> String) async throws {
        let group = try await getFlags(groupNameOrId: groupNameOrId, fetch: fetch)
        try setFlags(groupNameOrId: groupNameOrId, group: group)
    }

    public func should(groupNameOrId: String, featureNameOrId: String) throws -> Bool {
        return try shouldCustomString(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, instanceId: instanceId)
    }

    public func shouldCustomString(groupNameOrId: String, featureNameOrId: String, instanceId: String) throws -> Bool {
        let (environment, feature) = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        if try !isScheduledFeatureActive(feature: feature) {
            print("BAILING OUT AT INACTIVE SCHEDULE")
            return false
        }

        switch feature.featureType {
        case .toggle:
            let toggleFeature: ToggleFeature = try safeGet(dict: environment.toggleFeatures, key: feature.featureId)
            return toggleFeature.value
        case .gradual:
            let gradualFeature: GradualFeature = try safeGet(dict: environment.gradualFeatures, key: feature.featureId)
            return hashString(stringToHash: instanceId, seed: gradualFeature.seed) <= gradualFeature.value
        case .selective:
            let selectiveFeature: SelectiveFeature = try safeGet(dict: environment.selectiveFeatures, key: feature.featureId)

            switch selectiveFeature.valueType {
            case .string:
                let selectiveStringFeature: SelectiveStringFeature = try safeGet(dict: environment.selectiveStringFeatures, key: feature.featureId)
                return selectiveStringFeature.value.contains(instanceId)
            default:
                throw "should function must only be called for features with a valueType of 'string'. Try shouldCustomInt, shouldCustomInt64, shouldCustomFloat, or shouldCustomFloat64"
            }
        case .value:
            throw "should cannot be called on features with featureType of 'value'"
        }
    }

    public func shouldCustomInt(groupNameOrId: String, featureNameOrId: String, instanceId: Int32) throws -> Bool {
        return try shouldCustomInt64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, instanceId: Int64(instanceId))
    }

    public func shouldCustomInt64(groupNameOrId: String, featureNameOrId: String, instanceId: Int64) throws -> Bool {
        let (environment, feature) = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        if try !isScheduledFeatureActive(feature: feature) {
            return false
        }

        switch feature.featureType {
        case .toggle:
            let toggleFeature: ToggleFeature = try safeGet(dict: environment.toggleFeatures, key: feature.featureId)
            return toggleFeature.value
        case .gradual:
            let gradualFeature: GradualFeature = try safeGet(dict: environment.gradualFeatures, key: feature.featureId)
            return hashInt64(intToHash: instanceId, seed: gradualFeature.seed) > gradualFeature.value
        case .selective:
            let selectiveFeature: SelectiveFeature = try safeGet(dict: environment.selectiveFeatures, key: feature.featureId)

            switch selectiveFeature.valueType {
            case .number:
                let selectiveNumberFeature: SelectiveNumberFeature = try safeGet(dict: environment.selectiveNumberFeatures, key: feature.featureId)
                switch selectiveNumberFeature.numberType {
                case .int:
                    let selectiveIntFeature: SelectiveIntFeature = try safeGet(dict: environment.selectiveIntFeatures, key: feature.featureId)
                    return selectiveIntFeature.value.contains(instanceId)
                default:
                    throw "shouldCustomInt/shouldCustomInt64 function must only be called for features with a numberType of 'int'. Try shouldFloat or shouldFloat64"
                }
            default:
                throw "shouldCustomInt/shouldCustomInt64 function must only be called for features with a valueType of 'number'. Try should or shouldCustomString"
            }
        case .value:
            throw "should cannot be called on features with featureType of 'value'"
        }
    }

    public func shouldCustomFloat(groupNameOrId: String, featureNameOrId: String, instanceId: Float32) throws -> Bool {
        return try shouldCustomFloat64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, instanceId: Float64(instanceId))
    }

    public func shouldCustomFloat64(groupNameOrId: String, featureNameOrId: String, instanceId: Float64) throws -> Bool {
        let (environment, feature) = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        if try !isScheduledFeatureActive(feature: feature) {
            return false
        }

        switch feature.featureType {
        case .toggle:
            let toggleFeature: ToggleFeature = try safeGet(dict: environment.toggleFeatures, key: feature.featureId)
            return toggleFeature.value
        case .gradual:
            let gradualFeature: GradualFeature = try safeGet(dict: environment.gradualFeatures, key: feature.featureId)
            return hashFloat64(floatToHash: instanceId, seed: gradualFeature.seed) > gradualFeature.value
        case .selective:
            let selectiveFeature: SelectiveFeature = try safeGet(dict: environment.selectiveFeatures, key: feature.featureId)

            switch selectiveFeature.valueType {
            case .number:
                let selectiveNumberFeature: SelectiveNumberFeature = try safeGet(dict: environment.selectiveNumberFeatures, key: feature.featureId)
                switch selectiveNumberFeature.numberType {
                case .float:
                    let selectiveFloatFeature: SelectiveFloatFeature = try safeGet(dict: environment.selectiveFloatFeatures, key: feature.featureId)
                    return selectiveFloatFeature.value.contains(instanceId)
                default:
                    throw "shouldCustomFloat/shouldCustomFloat64 function must only be called for features with a numberType of 'float'. Try shouldInt or shouldInt64"
                }
            default:
                throw "shouldCustomFloat/shouldCustomFloat64 function must only be called for features with a valueType of 'number'. Try should or shouldCustomString"
            }
        case .value:
            throw "should cannot be called on features with featureType of 'value'"
        }
    }

    public func valueString(groupNameOrId: String, featureNameOrId: String, defaultString: String) throws -> String {
        let (environment, feature) = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        if try !isScheduledFeatureActive(feature: feature) {
            return defaultString
        }

        switch feature.featureType {
        case .value:
            let valueFeature: ValueFeature = try safeGet(dict: environment.valueFeatures, key: feature.featureId)

            switch valueFeature.valueType {
            case .string:
                let valueStringFeature: ValueStringFeature = try safeGet(dict: environment.valueStringFeatures, key: feature.featureId)
                return valueStringFeature.value
            default:
                throw "valueString function must only be called for features with a valueType of 'string'. Try valueInt, valueInt64, valueFloat, or valueFloat64"
            }
        default:
            throw "valueString can only be called on features with featureType of 'value'"
        }
    }

    public func valueInt(groupNameOrId: String, featureNameOrId: String, defaultInt32: Int32) throws -> Int32 {
        return try Int32(valueInt64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, defaultInt64: Int64(defaultInt32)))
    }

    public func valueInt64(groupNameOrId: String, featureNameOrId: String, defaultInt64: Int64) throws -> Int64 {
        let (environment, feature) = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        if try !isScheduledFeatureActive(feature: feature) {
            return defaultInt64
        }

        switch feature.featureType {
        case .value:
            let valueFeature: ValueFeature = try safeGet(dict: environment.valueFeatures, key: feature.featureId)

            switch valueFeature.valueType {
            case .number:
                let valueIntFeature: ValueIntFeature = try safeGet(dict: environment.valueIntFeatures, key: feature.featureId)
                return valueIntFeature.value
            default:
                throw "valueInt/valueInt64 functions must only be called for features with a valueType of 'int'. Try valueString, valueFloat, or valueFloat64"
            }
        default:
            throw "valueString can only be called on features with featureType of 'value'"
        }
    }

    public func valueFloat(groupNameOrId: String, featureNameOrId: String, defaultFloat32: Float32) throws -> Float32 {
        return try Float32(valueFloat64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, defaultFloat64: Float64(defaultFloat32)))
    }

    public func valueFloat64(groupNameOrId: String, featureNameOrId: String, defaultFloat64: Float64) throws -> Float64 {
        let (environment, feature) = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        if try !isScheduledFeatureActive(feature: feature) {
            return defaultFloat64
        }

        switch feature.featureType {
        case .value:
            let valueFeature: ValueFeature = try safeGet(dict: environment.valueFeatures, key: feature.featureId)

            switch valueFeature.valueType {
            case .number:
                let valueFloatFeature: ValueFloatFeature = try safeGet(dict: environment.valueFloatFeatures, key: feature.featureId)
                return valueFloatFeature.value
            default:
                throw "valueFloat/valueFloat64 functions must only be called for features with a valueType of 'float'. Try valueString, valueInt, or valueInt64"
            }
        default:
            throw "valueString can only be called on features with featureType of 'value'"
        }
    }

    private func getFeature(groupNameOrId: String, featureNameOrId: String) throws -> (Environment, Feature) {
        // print("GETTING FEATURE:", groupNameOrId)
        // dump(groupLookupTable)
        let groupId: String = try safeGet(dict: groupLookupTable, key: groupNameOrId)

        let groupEnvironmentLookupTable: [String: String] = try safeGet(dict: environmentLookupTable, key: groupId)
        let environmentId: String = try safeGet(dict: groupEnvironmentLookupTable, key: environment)

        let groupFeatureLookupTable: [String: String] = try safeGet(dict: featureLookupTable, key: groupId)
        let featureId: String = try safeGet(dict: groupFeatureLookupTable, key: featureNameOrId)

        let group: Group = try safeGet(dict: flagGroups, key: groupId)

        let environment: Environment = try safeGet(dict: group.environments, key: environmentId)

        let feature: Feature = try safeGet(dict: environment.rawFeatures, key: featureId)

        return (environment, feature)
    }
}
