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

    public func getManifest(fetch: (URL) async throws -> Data) async throws -> Manifest {
        guard let url = URL(string: "\(baseUrl)/manifest.json") else {
            throw VexillaClientError.couldNotConstructUrl
        }
        let response = try await fetch(url)

        return try JSONDecoder().decode(Manifest.self, from: response)
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

    public mutating func syncManifest(fetch: (URL) async throws -> Data) async throws {
        let manifest = try await getManifest(fetch: fetch)
        setManifest(manifest: manifest)
    }

    public func getFlags(groupNameOrId: String, fetch: (URL) async throws -> Data) async throws -> Group {
        guard let groupId = groupLookupTable[groupNameOrId] else {
            throw VexillaClientError.couldNotFindKeyInLookupTable(tableName: "Group", nameOrId: groupNameOrId)
        }
        let url = "\(baseUrl)/\(groupId).json"
        guard let url = URL(string: url) else {
            throw VexillaClientError.couldNotConstructUrl
        }
        let response = try await fetch(url)
        return try JSONDecoder().decode(Group.self, from: response)
    }

    public mutating func setFlags(group: Group) throws {
        guard let groupId = groupLookupTable[group.groupId] else {
            throw VexillaClientError.couldNotFindKeyInLookupTable(tableName: "Group", nameOrId: group.groupId)
        }

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

    public mutating func syncFlags(groupNameOrId: String, fetch: (URL) async throws -> Data) async throws {
        let group = try await getFlags(groupNameOrId: groupNameOrId, fetch: fetch)
        try setFlags(group: group)
    }

    public func should(groupNameOrId: String, featureNameOrId: String) throws -> Bool {
        return try shouldCustomString(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, instanceId: instanceId)
    }

    public func shouldCustomString(groupNameOrId: String, featureNameOrId: String, instanceId: String) throws -> Bool {
        let feature = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        guard try isScheduledFeatureActive(feature: feature) else {
            return false
        }

        switch feature {
        case let .toggle(toggleFeature):
            return toggleFeature.value
        case let .gradual(gradualFeature):
            return hashString(stringToHash: instanceId, seed: gradualFeature.seed) <= gradualFeature.value
        case let .selective(selectiveFeature):
            switch selectiveFeature.value {
            case let .string(values):
                return values.contains(instanceId)
            default:
                throw VexillaClientError.invalidFeatureValueTypeError(functionName: #function, valueType: "string", otherFunctionsString: "should or shouldCustomString")
            }
        case .value:
            throw VexillaClientError.invalidFeatureTypeError(functionName: #function, featureType: "toggle, gradual, or selective")
        }
    }

    public func shouldCustomInt(groupNameOrId: String, featureNameOrId: String, instanceId: Int32) throws -> Bool {
        return try shouldCustomInt64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, instanceId: Int64(instanceId))
    }

    public func shouldCustomInt64(groupNameOrId: String, featureNameOrId: String, instanceId: Int64) throws -> Bool {
        let feature = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        guard try isScheduledFeatureActive(feature: feature) else {
            return false
        }

        switch feature {
        case let .toggle(toggleFeature):
            return toggleFeature.value
        case let .gradual(gradualFeature):
            return hashInt64(intToHash: instanceId, seed: gradualFeature.seed) > gradualFeature.value
        case let .selective(selectiveFeature):
            switch selectiveFeature.value {
            case let .int(values):
                return values.contains(instanceId)
            default:
                throw VexillaClientError.invalidFeatureNumberTypeError(functionName: #function, numberType: "int", otherFunctionsString: "should, shouldCustomString, shouldCustomFloat or shouldCustomFloat64")
            }
        case .value:
            throw VexillaClientError.invalidFeatureTypeError(functionName: #function, featureType: "toggle, gradual, or selective")
        }
    }

    public func shouldCustomFloat(groupNameOrId: String, featureNameOrId: String, instanceId: Float32) throws -> Bool {
        return try shouldCustomFloat64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, instanceId: Float64(instanceId))
    }

    public func shouldCustomFloat64(groupNameOrId: String, featureNameOrId: String, instanceId: Float64) throws -> Bool {
        let feature = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        guard try isScheduledFeatureActive(feature: feature) else {
            return false
        }

        switch feature {
        case let .toggle(toggleFeature):
            return toggleFeature.value
        case let .gradual(gradualFeature):
            return hashFloat64(floatToHash: instanceId, seed: gradualFeature.seed) > gradualFeature.value
        case let .selective(selectiveFeature):
            switch selectiveFeature.value {
            case let .float(values):
                return values.contains(instanceId)
            default:
                throw VexillaClientError.invalidFeatureNumberTypeError(functionName: #function, numberType: "float", otherFunctionsString: "should, shouldCustomString, shouldCustomInt or shouldCustomInt64")
            }
        case .value:
            throw VexillaClientError.invalidFeatureTypeError(functionName: #function, featureType: "toggle, gradual, or selective")
        }
    }

    public func valueString(groupNameOrId: String, featureNameOrId: String, defaultString: String) throws -> String {
        let feature = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        guard try isScheduledFeatureActive(feature: feature) else {
            return defaultString
        }

        guard case let .value(valueFeature) = feature else {
            throw VexillaClientError.invalidFeatureTypeError(functionName: #function, featureType: "value")
        }

        guard case let .string(string) = valueFeature.value else {
            throw VexillaClientError.invalidFeatureValueTypeError(functionName: #function, valueType: "string", otherFunctionsString: "valueInt, valueInt64, valueFloat, or valueFloat64")
        }

        return string
    }

    public func valueInt32(groupNameOrId: String, featureNameOrId: String, defaultInt32: Int32) throws -> Int32 {
        return try Int32(valueInt64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, defaultInt64: Int64(defaultInt32)))
    }

    public func valueInt64(groupNameOrId: String, featureNameOrId: String, defaultInt64: Int64) throws -> Int64 {
        let feature = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        guard try isScheduledFeatureActive(feature: feature) else {
            return defaultInt64
        }

        guard case let .value(valueFeature) = feature else {
            throw VexillaClientError.invalidFeatureTypeError(functionName: #function, featureType: "value")
        }

        guard case let .int(int) = valueFeature.value else {
            throw VexillaClientError.invalidFeatureValueTypeError(functionName: #function, valueType: "int", otherFunctionsString: "valueString, valueFloat, or valueFloat64")
        }

        return int
    }

    public func valueFloat(groupNameOrId: String, featureNameOrId: String, defaultFloat32: Float32) throws -> Float32 {
        return try Float32(valueFloat64(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId, defaultFloat64: Float64(defaultFloat32)))
    }

    public func valueFloat64(groupNameOrId: String, featureNameOrId: String, defaultFloat64: Float64) throws -> Float64 {
        let feature = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        guard try isScheduledFeatureActive(feature: feature) else {
            return defaultFloat64
        }

        guard case let .value(valueFeature) = feature else {
            throw VexillaClientError.invalidFeatureTypeError(functionName: #function, featureType: "value")
        }

        guard case let .float(float) = valueFeature.value else {
            throw VexillaClientError.invalidFeatureValueTypeError(functionName: #function, valueType: "float", otherFunctionsString: "valueString, valueInt, or valueInt64")
        }

        return float
    }

    private func getFeature(groupNameOrId: String, featureNameOrId: String) throws -> Feature {
        guard let groupId = groupLookupTable[groupNameOrId] else {
            throw VexillaClientError.couldNotFindKeyInLookupTable(tableName: "Group", nameOrId: groupNameOrId)
        }

        guard let groupEnvironmentLookupTable = environmentLookupTable[groupId] else {
            throw VexillaClientError.couldNotFindKeyInLookupTable(tableName: "Environment", nameOrId: groupId)
        }

        guard let environmentId = groupEnvironmentLookupTable[environment] else {
            throw VexillaClientError.couldNotFindKeyInLookupTable(tableName: "Environment", nameOrId: environment)
        }

        guard let featureLookupTable = featureLookupTable[groupId] else {
            throw VexillaClientError.couldNotFindKeyInNestedLookupTable(tableName: "Feature", groupId: groupId, nameOrId: featureNameOrId)
        }

        guard let featureId = featureLookupTable[featureNameOrId] else {
            throw VexillaClientError.couldNotFindKeyInLookupTable(tableName: "Feature", nameOrId: featureNameOrId)
        }

        guard let group = flagGroups[groupId] else {
            throw VexillaClientError.couldNotFindKeyInLookupTable(tableName: "Group", nameOrId: groupId)
        }

        guard let environment = group.environments[environmentId] else {
            throw VexillaClientError.couldNotFindKeyInNestedLookupTable(tableName: "Environment", groupId: groupId, nameOrId: environment)
        }

        guard let feature = environment.features[featureId] else {
            throw VexillaClientError.couldNotFindKeyInNestedLookupTable(tableName: "Environment", groupId: groupId, nameOrId: featureId)
        }

        return feature
    }
}
