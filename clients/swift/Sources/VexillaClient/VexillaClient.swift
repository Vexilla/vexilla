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
            throw "Internal VexillaClient Error: Invalid URL"
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
            throw "Group ID (\(groupNameOrId)) not found in lookup table. Did you fetch and set the manifest, yet?"
        }
        let url = "\(baseUrl)/\(groupId).json"
        guard let url = URL(string: url) else {
            throw "Internal VexillaClient Error: Invalid URL"
        }
        let response = try await fetch(url)
        return try JSONDecoder().decode(Group.self, from: response)
    }

    public mutating func setFlags(groupNameOrId: String, group: Group) throws {
        guard let groupId = groupLookupTable[groupNameOrId] else {
            throw "Group ID (\(groupNameOrId)) not found in lookup table. Did you fetch and set the manifest, yet?"
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
        try setFlags(groupNameOrId: groupNameOrId, group: group)
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
        case .toggle(let toggleFeature):
            return toggleFeature.value
        case .gradual(let gradualFeature):
            return hashString(stringToHash: instanceId, seed: gradualFeature.seed) <= gradualFeature.value
        case .selective(let selectiveFeature):
            switch selectiveFeature.value {
            case .string(let values):
                return values.contains(instanceId)
            default:
                throw "\(#function) must only be called for features with a valueType of 'number'. Try should or shouldCustomString"
            }
        case .value:
            throw "\(#function) should cannot be called on features with featureType of 'value'"
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
        case .toggle(let toggleFeature):
            return toggleFeature.value
        case .gradual(let gradualFeature):
            return hashInt64(intToHash: instanceId, seed: gradualFeature.seed) > gradualFeature.value
        case .selective(let selectiveFeature):
            switch selectiveFeature.value {
            case .int(let values):
                return values.contains(instanceId)
            default:
                throw "\(#function) must only be called for features with an int value. Try should or shouldCustomString"
            }
        case .value:
            throw "\(#function) should cannot be called on features with featureType of 'value'"
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
        case .toggle(let toggleFeature):
            return toggleFeature.value
        case .gradual(let gradualFeature):
            return hashFloat64(floatToHash: instanceId, seed: gradualFeature.seed) > gradualFeature.value
        case .selective(let selectiveFeature):
            switch selectiveFeature.value {
            case .float(let values):
                return values.contains(instanceId)
            default:
                throw "\(#function) must only be called for features with a valueType of 'number'. Try should or shouldCustomString"
            }
        case .value:
            throw "\(#function) should cannot be called on features with featureType of 'value'"
        }
    }

    public func valueString(groupNameOrId: String, featureNameOrId: String, defaultString: String) throws -> String {
        let feature = try getFeature(groupNameOrId: groupNameOrId, featureNameOrId: featureNameOrId)

        guard try isScheduledFeatureActive(feature: feature) else {
            return defaultString
        }

        guard case .value(let valueFeature) = feature else {
            throw "\(#function) can only be called on features with featureType of 'value'"
        }

        guard case .string(let string) = valueFeature.value else {
            throw "\(#function) can only be called on features with a valueType of 'string'"
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

        guard case .value(let valueFeature) = feature else {
            throw "\(#function) can only be called on features with featureType of 'value'"
        }
        
        guard case .int(let int) = valueFeature.value else {
            throw "\(#function) can only be called on features with a valueType of 'int'"
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

        guard case .value(let valueFeature) = feature else {
            throw "\(#function) can only be called on features with featureType of 'value'"
        }

        guard case .float(let float) = valueFeature.value else {
            throw "\(#function) can only be called on features with a valueType of 'float'"
        }

        return float
    }

    private func getFeature(groupNameOrId: String, featureNameOrId: String) throws -> Feature {
        guard let groupId = groupLookupTable[groupNameOrId] else {
            throw "Group ID (\(groupNameOrId)) not found in lookup table. Did you fetch and set the manifest, yet?"
        }
        
        guard let groupEnvironmentLookupTable = environmentLookupTable[groupId] else {
            throw "Environment lookup table not found for group ID (\(groupId)). Did you fetch and set the manifest, yet?"
        }
        
        guard let environmentId = groupEnvironmentLookupTable[environment] else {
            throw "Environment (\(environment)) not found in lookup table. Did you fetch and set the manifest, yet?"
        }

        guard let featureLookupTable = featureLookupTable[groupId] else {
            throw "Feature lookup table not found for group ID (\(groupId)). Did you fetch and set the manifest, yet?"
        }

        guard let featureId = featureLookupTable[featureNameOrId] else {
            throw "Feature ID (\(featureNameOrId)) not found in lookup table. Did you fetch and set the manifest, yet?"
        }

        guard let group = flagGroups[groupId] else {
            throw "Group ID (\(groupId)) not found in lookup table. Did you fetch and set the manifest, yet?"
        }

        guard let environment = group.environments[environmentId] else {
            throw "Environment (\(environment)) not found in lookup table. Did you fetch and set the manifest, yet?"
        }

        guard let feature = environment.features[featureId] else {
            throw "Feature ID (\(featureId)) not found in lookup table. Did you fetch and set the manifest, yet?"
        }
        
        return feature
    }
}
