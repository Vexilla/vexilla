import Foundation

@available(macOS 10.15.0, *)
public struct VexillaClient {
    private let environment: String
    private let baseUrl: String
    private let instanceId: InstanceId
    private var manifest: Manifest?
    private var groups = StringMap<Group>()
    private var groupAliases = StringMap<String>()
    private var environmentAliases = StringMap<StringMap<String>>()
    private var featureAliases = StringMap<StringMap<String>>()

    public init(environment: String, baseUrl: String, instanceId: String) {
        self.init(environment: environment, baseUrl: baseUrl, instanceId: .string(instanceId))
    }
    public init(environment: String, baseUrl: String, instanceId: InstanceId) {
        self.environment = environment; self.baseUrl = baseUrl; self.instanceId = instanceId
    }
    private func request(_ path: String, _ fetch: (URL) async throws -> Data) async throws -> Data {
        guard let url = URL(string: "\(baseUrl)/\(path)") else { throw VexillaError("fetch", "Could not construct URL") }
        do { return try await fetch(url) }
        catch { throw VexillaError("fetch", "Failed to fetch \(path): \(error)") }
    }
    public func getManifest(fetch: (URL) async throws -> Data) async throws -> Manifest {
        try Manifest.decode(data: await request("manifest.json", fetch))
    }
    public mutating func setManifest(manifest: Manifest) throws {
        try Validation.manifest(manifest.wire)
        var aliases = StringMap<String>()
        for entry in manifest.groups { try Validation.addAlias(&aliases, entry.groupId, entry.name) }
        for entry in groups {
            if !manifest.groups.contains(where: { exact($0.groupId,entry.key) && exact($0.name,entry.value.name) }) {
                groups[entry.key] = nil; environmentAliases[entry.key] = nil; featureAliases[entry.key] = nil
            }
        }
        self.manifest = manifest; groupAliases = aliases
    }
    public mutating func syncManifest(fetch: (URL) async throws -> Data) async throws {
        try setManifest(manifest: await getManifest(fetch: fetch))
    }
    private func groupID(_ name: String) throws -> String {
        guard let id = groupAliases[name] else { throw VexillaError("lookup", "Group not found: \(name)") }
        return id
    }
    private func match(_ group: Group) throws {
        guard let manifest = manifest else { throw VexillaError("lookup", "Manifest not installed") }
        try Validation.require(manifest.groups.contains(where: { exact($0.groupId,group.groupId) && exact($0.name,group.name) }), "Group differs from manifest ID/name")
    }
    public func getFlags(groupNameOrId: String, fetch: (URL) async throws -> Data) async throws -> Group {
        let id = try groupID(groupNameOrId)
        let group = try Group.decode(data: await request("\(id).json",fetch))
        try match(group); try Validation.require(exact(group.groupId,id),"Fetched group differs from requested group")
        return group
    }
    public mutating func setFlags(group: Group) throws {
        try Validation.group(group.wire); try match(group)
        var environments = StringMap<String>(); var features = StringMap<String>()
        for env in group.environments { try Validation.addAlias(&environments,env.key,env.value.name) }
        for feature in group.features { try Validation.addAlias(&features,feature.key,feature.value.name) }
        groups[group.groupId] = group; environmentAliases[group.groupId] = environments; featureAliases[group.groupId] = features
    }
    public mutating func syncFlags(groupNameOrId: String, fetch: (URL) async throws -> Data) async throws {
        try setFlags(group: await getFlags(groupNameOrId: groupNameOrId,fetch: fetch))
    }
    private func getFeature(_ group: String, _ feature: String) throws -> Feature {
        let id = try groupID(group)
        guard let stored = groups[id], let env = environmentAliases[id]?[environment],
              let fid = featureAliases[id]?[feature], let value = stored.environments[env]?.features[fid] else {
            throw VexillaError("lookup", "Feature/environment not installed")
        }
        return value
    }
    public func should(groupNameOrId: String, featureNameOrId: String) throws -> Bool {
        try shouldCustom(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,instanceId: instanceId)
    }
    public func shouldCustomString(groupNameOrId: String, featureNameOrId: String, instanceId: String) throws -> Bool {
        try shouldCustom(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,instanceId: .string(instanceId))
    }
    public func shouldCustomInt(groupNameOrId: String, featureNameOrId: String, instanceId: Int32) throws -> Bool {
        try shouldCustomInt64(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,instanceId: Int64(instanceId))
    }
    public func shouldCustomInt64(groupNameOrId: String, featureNameOrId: String, instanceId: Int64) throws -> Bool {
        try shouldCustom(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,instanceId: .integer(instanceId))
    }
    public func shouldCustomFloat(groupNameOrId: String, featureNameOrId: String, instanceId: Float) throws -> Bool {
        try shouldCustomFloat64(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,instanceId: Double(instanceId))
    }
    public func shouldCustomFloat64(groupNameOrId: String, featureNameOrId: String, instanceId: Double) throws -> Bool {
        try shouldCustom(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,instanceId: .number(instanceId))
    }
    public func shouldCustom(groupNameOrId: String, featureNameOrId: String, instanceId: InstanceId) throws -> Bool {
        let feature = try getFeature(groupNameOrId,featureNameOrId)
        if case .value = feature { throw VexillaError("kind","Value feature requires a value operation") }
        if case let .toggle(toggle) = feature { return try isScheduledFeatureActive(feature: feature) && toggle.value }
        let text = try instanceText(instanceId)
        guard try isScheduledFeatureActive(feature: feature) else { return false }
        if case let .gradual(f) = feature { return hashString(stringToHash: text,seed: f.seed) < f.value }
        guard case let .selective(f) = feature else { throw VexillaError("kind","Unsupported boolean operation") }
        switch f.value {
        case let .string(values):
            guard case let .string(id) = instanceId else { return false }
            return values.contains(where: { exact($0,id) })
        case let .int(values):
            if case .string = instanceId { return false }
            let number: Double
            switch instanceId { case let .integer(v): number = Double(v); case let .number(v): number = v; default: return false }
            return values.contains(where: { Double($0) == number })
        case let .float(values):
            if case .string = instanceId { return false }
            let number: Double
            switch instanceId { case let .integer(v): number = Double(v); case let .number(v): number = v; default: return false }
            return values.contains(number)
        }
    }
    public func value(groupNameOrId: String,featureNameOrId: String,defaultValue: Any) throws -> Any {
        let feature = try getFeature(groupNameOrId,featureNameOrId)
        guard case let .value(f) = feature else { throw VexillaError("kind","Feature is not a value") }
        guard try isScheduledFeatureActive(feature: feature) else { return defaultValue }
        switch f.value { case let .string(v): return v; case let .int(v): return v; case let .float(v): return v }
    }
    public func valueString(groupNameOrId: String,featureNameOrId: String,defaultString: String) throws -> String {
        let feature = try getFeature(groupNameOrId,featureNameOrId)
        guard case let .value(f) = feature, case let .string(v) = f.value else { throw VexillaError("kind","Expected string value feature") }
        return try isScheduledFeatureActive(feature: feature) ? v : defaultString
    }
    public func valueInt32(groupNameOrId: String,featureNameOrId: String,defaultInt32: Int32) throws -> Int32 {
        let value = try valueInt64(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,defaultInt64: Int64(defaultInt32))
        guard let result = Int32(exactly: value) else { throw VexillaError("kind","Value is outside Int32") }
        return result
    }
    public func valueInt64(groupNameOrId: String,featureNameOrId: String,defaultInt64: Int64) throws -> Int64 {
        let feature = try getFeature(groupNameOrId,featureNameOrId)
        guard case let .value(f) = feature, case let .int(v) = f.value else { throw VexillaError("kind","Expected integer value feature") }
        return try isScheduledFeatureActive(feature: feature) ? v : defaultInt64
    }
    public func valueFloat(groupNameOrId: String,featureNameOrId: String,defaultFloat32: Float) throws -> Float {
        Float(try valueFloat64(groupNameOrId: groupNameOrId,featureNameOrId: featureNameOrId,defaultFloat64: Double(defaultFloat32)))
    }
    public func valueFloat64(groupNameOrId: String,featureNameOrId: String,defaultFloat64: Double) throws -> Double {
        let feature = try getFeature(groupNameOrId,featureNameOrId)
        guard case let .value(f) = feature, case let .float(v) = f.value else { throw VexillaError("kind","Expected float value feature") }
        return try isScheduledFeatureActive(feature: feature) ? v : defaultFloat64
    }
}
