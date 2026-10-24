package dev.vexilla

class Client(
    private val baseUrl: String,
    private val environment: String,
    private val instanceId: Any?,
) {
    constructor(
        baseUrl: String,
        environment: String,
        instanceId: String,
    ) : this(baseUrl, environment, instanceId as Any?)

    private var manifest: Manifest? = null
    private var groups: Map<String, Group> = emptyMap()
    private var groupAliases: Map<String, String> = emptyMap()
    private var environmentAliases: Map<String, Map<String, String>> = emptyMap()
    private var featureAliases: Map<String, Map<String, String>> = emptyMap()

    private suspend fun request(path: String, fetch: suspend (String) -> String): String {
        try {
            return fetch(baseUrl.trimEnd('/') + "/" + path)
        } catch (e: Exception) {
            if (e is java.util.concurrent.CancellationException) {
                throw e
            }
            throw ContractException("fetch", "Failed to fetch $path: " + e.message)
        }
    }

    suspend fun getManifest(fetch: suspend (String) -> String): Manifest =
        VexillaCodec.decodeManifest(request("manifest.json", fetch))

    fun setManifest(manifest: Manifest) {
        val snapshot = VexillaCodec.manifest(VexillaCodec.json(manifest))
        val aliases = mutableMapOf<String, String>()
        snapshot.groups.forEach { Validation.addAlias(aliases, it.groupId, it.name) }
        val surviving =
            groups.filter { (id, g) ->
                snapshot.groups.any { it.groupId == id && it.name == g.name }
            }
        this.manifest = snapshot
        groups = surviving
        groupAliases = aliases
        environmentAliases = environmentAliases.filterKeys { it in surviving }
        featureAliases = featureAliases.filterKeys { it in surviving }
    }

    suspend fun syncManifest(fetch: suspend (String) -> String) {
        setManifest(getManifest(fetch))
    }

    private fun groupID(name: String) =
        groupAliases[name] ?: throw ContractException("lookup", "Group not found: $name")

    private fun match(group: Group) {
        val m = manifest ?: throw ContractException("lookup", "Manifest not installed")
        Validation.check(
            m.groups.any { it.groupId == group.groupId && it.name == group.name },
            "Group differs from manifest ID/name",
        )
    }

    suspend fun getFlags(groupNameOrId: String, fetch: suspend (String) -> String): Group {
        val id = groupID(groupNameOrId)
        val group = VexillaCodec.decodeGroup(request("$id.json", fetch))
        match(group)
        Validation.check(group.groupId == id, "Fetched group differs from requested group")
        return group
    }

    fun setFlags(group: Group) {
        val snapshot = VexillaCodec.group(VexillaCodec.json(group))
        match(snapshot)
        val environments = mutableMapOf<String, String>()
        val features = mutableMapOf<String, String>()
        snapshot.environments.forEach { (id, env) ->
            Validation.addAlias(environments, id, env.name)
        }
        snapshot.features.forEach { (id, feature) ->
            Validation.addAlias(features, id, feature.name)
        }
        groups = groups + (snapshot.groupId to snapshot)
        environmentAliases = environmentAliases + (snapshot.groupId to environments)
        featureAliases = featureAliases + (snapshot.groupId to features)
    }

    suspend fun syncFlags(groupNameOrId: String, fetch: suspend (String) -> String) {
        setFlags(getFlags(groupNameOrId, fetch))
    }

    private fun feature(group: String, name: String): Feature {
        val id = groupID(group)
        val stored = groups[id] ?: throw ContractException("lookup", "Group not installed")
        val env =
            environmentAliases[id]?.get(environment)
                ?: throw ContractException("lookup", "Environment not found")
        val fid =
            featureAliases[id]?.get(name) ?: throw ContractException("lookup", "Feature not found")
        return stored.environments[env]?.features?.get(fid)
            ?: throw ContractException("lookup", "Feature not installed")
    }

    fun should(
        groupNameOrId: String,
        featureNameOrId: String,
        instanceId: String? = null,
    ): Result<Boolean> = shouldCustom(groupNameOrId, featureNameOrId, instanceId ?: this.instanceId)

    fun shouldCustomInt(
        groupNameOrId: String,
        featureNameOrId: String,
        instanceId: Int,
    ): Result<Boolean> = shouldCustom(groupNameOrId, featureNameOrId, instanceId)

    fun shouldCustomLong(
        groupNameOrId: String,
        featureNameOrId: String,
        instanceId: Long,
    ): Result<Boolean> = shouldCustom(groupNameOrId, featureNameOrId, instanceId)

    fun shouldCustomFloat(
        groupNameOrId: String,
        featureNameOrId: String,
        instanceId: Float,
    ): Result<Boolean> = shouldCustom(groupNameOrId, featureNameOrId, instanceId)

    fun shouldCustomDouble(
        groupNameOrId: String,
        featureNameOrId: String,
        instanceId: Double,
    ): Result<Boolean> = shouldCustom(groupNameOrId, featureNameOrId, instanceId)

    fun shouldCustom(
        groupNameOrId: String,
        featureNameOrId: String,
        instanceId: Any?,
    ): Result<Boolean> = runCatching {
        val f = feature(groupNameOrId, featureNameOrId)
        if (f is ValueFeature) {
            throw ContractException("kind", "Value feature requires a value operation")
        }
        if (f is ToggleFeature) {
            return@runCatching Scheduler.isScheduledFeatureActive(f) && f.value
        }
        Hasher.validateInstance(instanceId)
        if (!Scheduler.isScheduledFeatureActive(f)) {
            return@runCatching false
        }
        when (f) {
            is GradualFeature ->
                Hasher.hashString(Hasher.instanceText(instanceId), f.seed) < f.value
            is SelectiveStringFeature -> instanceId is String && instanceId in f.value
            is SelectiveIntFeature ->
                instanceId is Number && f.value.any { it.toDouble() == instanceId.toDouble() }
            is SelectiveFloatFeature -> instanceId is Number && instanceId.toDouble() in f.value
            else -> throw ContractException("kind", "Unsupported boolean feature")
        }
    }

    fun value(groupNameOrId: String, featureNameOrId: String, default: Any?): Result<Any?> =
        runCatching {
            val f = feature(groupNameOrId, featureNameOrId)
            if (f !is ValueFeature) {
                throw ContractException("kind", "Feature is not a value")
            }
            if (!Scheduler.isScheduledFeatureActive(f)) {
                return@runCatching default
            }
            when (f) {
                is ValueStringFeature -> f.value
                is ValueIntFeature -> f.value
                is ValueFloatFeature -> f.value
            }
        }

    fun valueString(
        groupNameOrId: String,
        featureNameOrId: String,
        default: String,
    ): Result<String> = runCatching {
        val f = feature(groupNameOrId, featureNameOrId)
        if (f !is ValueStringFeature) {
            throw ContractException("kind", "Expected string value feature")
        }
        if (Scheduler.isScheduledFeatureActive(f)) {
            f.value
        } else {
            default
        }
    }

    fun valueLong(groupNameOrId: String, featureNameOrId: String, default: Long): Result<Long> =
        runCatching {
            val f = feature(groupNameOrId, featureNameOrId)
            if (f !is ValueIntFeature) {
                throw ContractException("kind", "Expected integer value feature")
            }
            if (Scheduler.isScheduledFeatureActive(f)) {
                f.value
            } else {
                default
            }
        }

    fun valueInt(groupNameOrId: String, featureNameOrId: String, default: Int): Result<Int> =
        valueLong(groupNameOrId, featureNameOrId, default.toLong()).mapCatching {
            if (it < Int.MIN_VALUE || it > Int.MAX_VALUE) {
                throw ContractException("kind", "Value is outside Int")
            }
            it.toInt()
        }

    fun valueDouble(
        groupNameOrId: String,
        featureNameOrId: String,
        default: Double,
    ): Result<Double> = runCatching {
        val f = feature(groupNameOrId, featureNameOrId)
        if (f !is ValueFloatFeature) {
            throw ContractException("kind", "Expected float value feature")
        }
        if (Scheduler.isScheduledFeatureActive(f)) {
            f.value
        } else {
            default
        }
    }

    fun valueFloat(groupNameOrId: String, featureNameOrId: String, default: Float): Result<Float> =
        valueDouble(groupNameOrId, featureNameOrId, default.toDouble()).map { it.toFloat() }
}
