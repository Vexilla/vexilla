package dev.vexilla

class Client(
    private val baseUrl: String,
    private val environment: String,
    private val instanceId: Any?,
    private val showLogs: Boolean = false,
) {
    constructor(
        baseUrl: String,
        environment: String,
        instanceId: String,
        showLogs: Boolean = false,
    ) : this(baseUrl, environment, instanceId as Any?, showLogs)

    private var manifest: Manifest? = null
    private var groups: Map<String, Group> = emptyMap()
    private var groupAliases: Map<String, String> = emptyMap()
    private var environmentAliases: Map<String, Map<String, String>> = emptyMap()
    private var featureAliases: Map<String, Map<String, String>> = emptyMap()

    private val diagnosticLogger = java.util.logging.Logger.getLogger(Client::class.java.name)

    private inline fun <T> diagnoseOperation(operationName: String, operation: () -> T): T {
        try {
            val result = operation()
            if (showLogs) {
                diagnosticLogger.info("vexilla operation=$operationName outcome=success")
            }
            return result
        } catch (error: Exception) {
            if (error is java.util.concurrent.CancellationException) throw error
            if (showLogs) {
                diagnosticLogger.warning("vexilla operation=$operationName outcome=failure")
            }
            throw error
        }
    }

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
        diagnoseOperation("manifest.fetch") {
            VexillaCodec.decodeManifest(request("manifest.json", fetch))
        }

    fun setManifest(manifest: Manifest) {
        diagnoseOperation("manifest.install") {
            val snapshot = VexillaCodec.manifest(VexillaCodec.json(manifest))
            val aliases = mutableMapOf<String, String>()
            snapshot.groups.forEach { Validation.addAlias(aliases, it.groupId, it.name) }
            val surviving =
                groups.filter { (groupId, installedGroup) ->
                    snapshot.groups.any { it.groupId == groupId && it.name == installedGroup.name }
                }
            this.manifest = snapshot
            groups = surviving
            groupAliases = aliases
            environmentAliases = environmentAliases.filterKeys { it in surviving }
            featureAliases = featureAliases.filterKeys { it in surviving }
        }
    }

    suspend fun syncManifest(fetch: suspend (String) -> String) {
        setManifest(getManifest(fetch))
    }

    private fun groupID(name: String) =
        groupAliases[name] ?: throw ContractException("lookup", "Group not found: $name")

    private fun match(group: Group) {
        val installedManifest =
            manifest ?: throw ContractException("lookup", "Manifest not installed")
        Validation.check(
            installedManifest.groups.any { it.groupId == group.groupId && it.name == group.name },
            "Group differs from manifest ID/name",
        )
    }

    suspend fun getFlags(groupNameOrId: String, fetch: suspend (String) -> String): Group {
        return diagnoseOperation("group.fetch") {
            val groupId = groupID(groupNameOrId)
            val group = VexillaCodec.decodeGroup(request("$groupId.json", fetch))
            match(group)
            Validation.check(group.groupId == groupId, "Fetched group differs from requested group")
            group
        }
    }

    fun setFlags(group: Group) {
        diagnoseOperation("group.install") {
            val snapshot = VexillaCodec.group(VexillaCodec.json(group))
            match(snapshot)
            val environments = mutableMapOf<String, String>()
            val features = mutableMapOf<String, String>()
            snapshot.environments.forEach { (environmentId, environment) ->
                Validation.addAlias(environments, environmentId, environment.name)
            }
            snapshot.features.forEach { (featureId, feature) ->
                Validation.addAlias(features, featureId, feature.name)
            }
            groups = groups + (snapshot.groupId to snapshot)
            environmentAliases = environmentAliases + (snapshot.groupId to environments)
            featureAliases = featureAliases + (snapshot.groupId to features)
        }
    }

    suspend fun syncFlags(groupNameOrId: String, fetch: suspend (String) -> String) {
        setFlags(getFlags(groupNameOrId, fetch))
    }

    private fun feature(group: String, name: String): Feature {
        val groupId = groupID(group)
        val stored = groups[groupId] ?: throw ContractException("lookup", "Group not installed")
        val environmentId =
            environmentAliases[groupId]?.get(environment)
                ?: throw ContractException("lookup", "Environment not found")
        val featureId =
            featureAliases[groupId]?.get(name)
                ?: throw ContractException("lookup", "Feature not found")
        return stored.environments[environmentId]?.features?.get(featureId)
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
        val feature = feature(groupNameOrId, featureNameOrId)
        if (feature is ValueFeature) {
            throw ContractException("kind", "Value feature requires a value operation")
        }
        if (feature is ToggleFeature) {
            return@runCatching Scheduler.isScheduledFeatureActive(feature) && feature.value
        }
        Hasher.validateInstance(instanceId)
        if (!Scheduler.isScheduledFeatureActive(feature)) {
            return@runCatching false
        }
        when (feature) {
            is GradualFeature ->
                Hasher.hashString(Hasher.instanceText(instanceId), feature.seed) < feature.value
            is SelectiveStringFeature -> instanceId is String && instanceId in feature.value
            is SelectiveIntFeature ->
                instanceId is Number && feature.value.any { it.toDouble() == instanceId.toDouble() }
            is SelectiveFloatFeature ->
                instanceId is Number && instanceId.toDouble() in feature.value
            else -> throw ContractException("kind", "Unsupported boolean feature")
        }
    }

    fun value(groupNameOrId: String, featureNameOrId: String, default: Any?): Result<Any?> =
        runCatching {
            val feature = feature(groupNameOrId, featureNameOrId)
            if (feature !is ValueFeature) {
                throw ContractException("kind", "Feature is not a value")
            }
            if (!Scheduler.isScheduledFeatureActive(feature)) {
                return@runCatching default
            }
            when (feature) {
                is ValueStringFeature -> feature.value
                is ValueIntFeature -> feature.value
                is ValueFloatFeature -> feature.value
            }
        }

    fun valueString(
        groupNameOrId: String,
        featureNameOrId: String,
        default: String,
    ): Result<String> = runCatching {
        val feature = feature(groupNameOrId, featureNameOrId)
        if (feature !is ValueStringFeature) {
            throw ContractException("kind", "Expected string value feature")
        }
        if (Scheduler.isScheduledFeatureActive(feature)) {
            feature.value
        } else {
            default
        }
    }

    fun valueLong(groupNameOrId: String, featureNameOrId: String, default: Long): Result<Long> =
        runCatching {
            val feature = feature(groupNameOrId, featureNameOrId)
            if (feature !is ValueIntFeature) {
                throw ContractException("kind", "Expected integer value feature")
            }
            if (Scheduler.isScheduledFeatureActive(feature)) {
                feature.value
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
        val feature = feature(groupNameOrId, featureNameOrId)
        if (feature !is ValueFloatFeature) {
            throw ContractException("kind", "Expected float value feature")
        }
        if (Scheduler.isScheduledFeatureActive(feature)) {
            feature.value
        } else {
            default
        }
    }

    fun valueFloat(groupNameOrId: String, featureNameOrId: String, default: Float): Result<Float> =
        valueDouble(groupNameOrId, featureNameOrId, default.toDouble()).map { it.toFloat() }
}
