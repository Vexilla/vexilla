package dev.vexilla

import kotlinx.serialization.json.Json

class Client(
    private val baseUrl: String,
    private val environment: String,
    private val customInstanceHash: String,
    private val showLogs: Boolean? = false
) {

    private var manifest: Manifest? = null
    private var flagGroups: MutableMap<String, Group> = mutableMapOf()

    private var groupLookupTable: MutableMap<String, String> = mutableMapOf()
    private var environmentLookupTable: MutableMap<String, MutableMap<String, String>> = mutableMapOf()
    private var featureLookupTable: MutableMap<String, MutableMap<String, String>> = mutableMapOf()

    suspend fun getManifest(fetch: suspend (url: String) -> String): Manifest {
        val url = "${this.baseUrl}/manifest.json"
        val response = fetch(url)
        val manifest = Json.decodeFromString<Manifest>(response)
        return manifest
    }

    fun setManifest(manifest: Manifest) {
        this.manifest = manifest

        for (group in manifest.groups) {
            this.groupLookupTable[group.name] = group.groupId
            this.groupLookupTable[group.groupId] = group.groupId
        }
    }

    suspend fun syncManifest(fetch: suspend (url: String) -> String) {
        val manifest = this.getManifest(fetch)
        this.setManifest(manifest)
    }

    suspend fun getFlags(groupNameOrId: String, fetch: suspend (url: String) -> String): Group {
        val groupId = this.groupLookupTable[groupNameOrId]
        val url = "${this.baseUrl}/${groupId}.json"
        val response = fetch(url)

        val group = Json.decodeFromString<Group>(response)

        return group
    }

    fun setFlags(groupNameOrId: String, group: Group) {
        val groupId = this.groupLookupTable[groupNameOrId] ?: throw Error("Group (${groupNameOrId}) not found")
        this.flagGroups[groupId] = group

        if (this.environmentLookupTable[groupId] == null) {
            this.environmentLookupTable[groupId] = mutableMapOf()
        }

        for (entry in group.environments.entries) {
            this.environmentLookupTable[groupId]?.set(entry.value.name, entry.value.environmentId)
            this.environmentLookupTable[groupId]?.set(entry.value.environmentId, entry.value.environmentId)
        }


        if (this.featureLookupTable[groupId] == null) {
            this.featureLookupTable[groupId] = mutableMapOf()
        }

        for (entry in group.features.entries) {
            this.featureLookupTable[groupId]?.set(entry.value.name, entry.value.featureId)
            this.featureLookupTable[groupId]?.set(entry.value.featureId, entry.value.featureId)
        }
    }

    suspend fun syncFlags(groupNameOrId: String, fetch: suspend (url: String) -> String) {
        val flags = this.getFlags(groupNameOrId, fetch)
        this.setFlags(groupNameOrId, flags)
    }

    fun should(groupNameOrId: String, featureNameOrId: String, instanceId: String = this.customInstanceHash): Boolean {
        val feature = this.getFeature(groupNameOrId, featureNameOrId)
        if (!Scheduler.isScheduledFeatureActive(feature)) {
            return false
        }

        return when (feature) {
            is ToggleFeature -> feature.value
            is GradualFeature -> Hasher.hashString(instanceId, feature.seed) < feature.value
            is SelectiveFeature -> {
                when (feature) {
                    is SelectiveStringFeature -> feature.value.contains(instanceId)
                    else -> throw Error("should function must only be called for features with a valueType of 'string'. Try shouldInt, shouldLong, shouldFloat, or shouldDouble")
                }
            }

            is ValueFeature -> throw Error("should cannot be called on features with featureType of 'value'")
        }
    }

    fun shouldCustomInt(groupNameOrId: String, featureNameOrId: String, instanceId: Int): Boolean {
        return this.shouldCustomLong(groupNameOrId, featureNameOrId, instanceId.toLong())
    }

    fun shouldCustomLong(groupNameOrId: String, featureNameOrId: String, instanceId: Long): Boolean {
        val feature = this.getFeature(groupNameOrId, featureNameOrId)
        if (!Scheduler.isScheduledFeatureActive(feature)) {
            return false
        }

        return when (feature) {
            is ToggleFeature -> feature.value
            is GradualFeature -> Hasher.hashLong(instanceId, feature.seed) < feature.value
            is SelectiveFeature -> {
                when (feature) {
                    is SelectiveIntFeature -> feature.value.contains(instanceId)
                    else -> throw Error("shouldCustomInt/shouldCustomLong function must only be called for features with a valueType of 'int'. Try should, shouldFloat, or shouldDouble")
                }
            }

            is ValueFeature -> throw Error("shouldCustomInt/shouldCustomLong cannot be called on features with featureType of 'value'")
        }
    }

    fun shouldCustomFloat(groupNameOrId: String, featureNameOrId: String, instanceId: Float): Boolean {
        return this.shouldCustomDouble(groupNameOrId, featureNameOrId, instanceId.toDouble())
    }

    fun shouldCustomDouble(groupNameOrId: String, featureNameOrId: String, instanceId: Double): Boolean {
        val feature = this.getFeature(groupNameOrId, featureNameOrId)
        if (!Scheduler.isScheduledFeatureActive(feature)) {
            return false
        }

        return when (feature) {
            is ToggleFeature -> feature.value
            is GradualFeature -> Hasher.hashDouble(instanceId, feature.seed) < feature.value
            is SelectiveFeature -> {
                when (feature) {
                    is SelectiveFloatFeature -> feature.value.contains(instanceId)
                    else -> throw Error("shouldCustomFloat/shouldCustomDouble function must only be called for features with a valueType of 'int'. Try should, shouldFloat, or shouldDouble")
                }
            }

            is ValueFeature -> throw Error("shouldCustomFloat/shouldCustomDouble cannot be called on features with featureType of 'value'")
        }
    }

    fun valueString(groupNameOrId: String, featureNameOrId: String, default: String): String {
        val feature = this.getFeature(groupNameOrId, featureNameOrId)
        if (!Scheduler.isScheduledFeatureActive(feature)) {
            return default
        }

        when (feature) {
            is ValueFeature -> {
                when (feature) {
                    is ValueStringFeature -> return feature.value
                    else -> throw Error("valueString function must only be called for features with a valueType of 'string'. Try valueInt, valueLong, valueFloat, or valueDouble")
                }
            }

            else -> throw Error("valueString can only be called on features with featureType of 'value'")
        }
    }

    fun valueInt(groupNameOrId: String, featureNameOrId: String, default: Int): Int {
        return this.valueLong(groupNameOrId, featureNameOrId, default.toLong()).toInt()
    }

    fun valueLong(groupNameOrId: String, featureNameOrId: String, default: Long): Long {
        val feature = this.getFeature(groupNameOrId, featureNameOrId)
        if (!Scheduler.isScheduledFeatureActive(feature)) {
            return default
        }

        when (feature) {
            is ValueFeature -> {
                when (feature) {
                    is ValueIntFeature -> return feature.value
                    else -> throw Error("valueInt/valueLong functions must only be called for features with a valueType of 'int'. Try valueString, valueFloat, or valueDouble")
                }
            }

            else -> throw Error("valueString can only be called on features with featureType of 'value'")
        }
    }

    fun valueFloat(groupNameOrId: String, featureNameOrId: String, default: Float): Float {
        return this.valueDouble(groupNameOrId, featureNameOrId, default.toDouble()).toFloat()
    }

    fun valueDouble(groupNameOrId: String, featureNameOrId: String, default: Double): Double {
        val feature = this.getFeature(groupNameOrId, featureNameOrId)
        if (!Scheduler.isScheduledFeatureActive(feature)) {
            return default
        }

        when (feature) {
            is ValueFeature -> {
                when (feature) {
                    is ValueFloatFeature -> return feature.value
                    else -> throw Error("valueFloat/valueDouble function must only be called for features with a valueType of 'float'. Try valueString, valueInt, or valueLong")
                }
            }

            else -> throw Error("valueString can only be called on features with featureType of 'value'")
        }
    }


    private fun getFeature(groupNameOrId: String, featureNameOrId: String): Feature {
        val groupId = this.groupLookupTable[groupNameOrId] ?: throw Error("Group (${groupNameOrId}) not found")
        val groupEnvironments =
            this.environmentLookupTable[groupId] ?: throw Error("Environments not found for Group (${groupId})")
        val environmentId =
            groupEnvironments[this.environment] ?: throw Error("Environment (${this.environment}) not found")

        val groupFeatures = this.featureLookupTable[groupId] ?: throw Error("Features not found for Group (${groupId})")
        val featureId = groupFeatures[featureNameOrId] ?: throw Error("Feature (${featureNameOrId}) not found")

        val group = this.flagGroups[groupId] ?: throw Error("Group (${groupId}) not found")
        val environment = group.environments[environmentId] ?: throw Error("Environment (${environmentId}) not found")

        return environment.features[featureId]
            ?: throw Error("Feature (${featureId}) not found in Environment (${environmentId}) for Group (${groupId})")
    }

}
