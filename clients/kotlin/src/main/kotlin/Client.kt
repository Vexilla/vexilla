package dev.vexilla

import kotlinx.serialization.json.*
import kotlin.reflect.typeOf

class Client(
    private val baseUrl: String,
    private val environment: String,
    private val instanceId: String,
    // private val showLogs: Boolean? = false
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

        val group = deserializeGroup(Json.parseToJsonElement(response))

        return group
    }

    fun setFlags(groupNameOrId: String, group: Group) {
        val groupId = this.groupLookupTable[groupNameOrId] ?: throw Error("Group (${groupNameOrId}) not found")
        this.flagGroups[groupId] = group

        if (this.environmentLookupTable[groupId] == null) {
            this.environmentLookupTable[groupId] = mutableMapOf()
        }

        for (entry in group.environments.entries) {
            this.environmentLookupTable[groupId]!![entry.value.name] = entry.value.environmentId
            this.environmentLookupTable[groupId]!![entry.value.environmentId] = entry.value.environmentId
        }


        if (this.featureLookupTable[groupId] == null) {
            this.featureLookupTable[groupId] = mutableMapOf()
        }

        for (entry in group.features.entries) {
            this.featureLookupTable[groupId]!![entry.value.name] = entry.value.featureId
            this.featureLookupTable[groupId]!![entry.value.featureId] = entry.value.featureId
        }
    }

    suspend fun syncFlags(groupNameOrId: String, fetch: suspend (url: String) -> String) {
        val flags = this.getFlags(groupNameOrId, fetch)
        this.setFlags(groupNameOrId, flags)
    }

    fun should(groupNameOrId: String, featureNameOrId: String, instanceId: String = this.instanceId): Boolean {
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

    private fun deserializeFeature(json: JsonElement): Feature {

        val featureId = json.jsonObject["featureId"]!!.jsonPrimitive.content
        val name = json.jsonObject["name"]!!.jsonPrimitive.content

        val scheduleType = when (json.jsonObject["scheduleType"]!!.jsonPrimitive.content) {
            ScheduleType.EMPTY.typeName -> ScheduleType.EMPTY
            ScheduleType.GLOBAL.typeName -> ScheduleType.GLOBAL
            ScheduleType.ENVIRONMENT.typeName -> ScheduleType.ENVIRONMENT
            else -> throw Exception("Unknown schedule type: " + json.jsonObject["scheduleType"]!!.jsonPrimitive.content)
        }


        val rawSchedule = json.jsonObject["schedule"]!!

        val scheduleTimeType = when (rawSchedule.jsonObject["timeType"]!!.jsonPrimitive.content) {
            ScheduleTimeType.NONE.typeName -> ScheduleTimeType.NONE
            ScheduleTimeType.DAILY.typeName -> ScheduleTimeType.DAILY
            ScheduleTimeType.START_END.typeName -> ScheduleTimeType.START_END
            else -> throw Exception("Unknown schedule time type: " + rawSchedule.jsonObject["timeType"]!!.jsonPrimitive.content)
        }

        val schedule = Schedule(
            start = rawSchedule.jsonObject["start"]!!.jsonPrimitive.content.toLong(),
            end = rawSchedule.jsonObject["end"]!!.jsonPrimitive.content.toLong(),
            timezone = rawSchedule.jsonObject["timezone"]!!.jsonPrimitive.content,
            timeType = scheduleTimeType,
            startTime = rawSchedule.jsonObject["startTime"]!!.jsonPrimitive.content.toLong(),
            endTime = rawSchedule.jsonObject["endTime"]!!.jsonPrimitive.content.toLong(),
        )


        return when (json.jsonObject["featureType"]?.jsonPrimitive?.content) {
            FeatureType.TOGGLE.typeName -> ToggleFeature(
                featureId = featureId,
                name = name,
                scheduleType = scheduleType,
                schedule = schedule,
                value = json.jsonObject["value"]!!.jsonPrimitive.content.toBoolean(),
            )

            FeatureType.GRADUAL.typeName -> GradualFeature(
                featureId = featureId,
                name = name,
                scheduleType = scheduleType,
                schedule = schedule,
                value = json.jsonObject["value"]!!.jsonPrimitive.content.toDouble(),
                seed = json.jsonObject["seed"]!!.jsonPrimitive.content.toDouble()
            )

            FeatureType.SELECTIVE.typeName -> when (json.jsonObject["valueType"]?.jsonPrimitive?.content) {
                ValueType.STRING.typeName -> SelectiveStringFeature(
                    featureId = featureId,
                    name = name,
                    scheduleType = scheduleType,
                    schedule = schedule,
                    value = json.jsonObject["value"]!!.jsonArray.map { it.jsonPrimitive.content }.toList()
                )

                ValueType.NUMBER.typeName -> when (json.jsonObject["numberType"]?.jsonPrimitive?.content) {
                    NumberType.INT.typeName -> SelectiveIntFeature(
                        featureId = featureId,
                        name = name,
                        scheduleType = scheduleType,
                        schedule = schedule,
                        value = json.jsonObject["value"]!!.jsonArray.map { it.jsonPrimitive.long }.toList()
                    )

                    NumberType.FLOAT.typeName -> SelectiveFloatFeature(
                        featureId = featureId,
                        name = name,
                        scheduleType = scheduleType,
                        schedule = schedule,
                        value = json.jsonObject["value"]!!.jsonArray.map { it.jsonPrimitive.double }.toList()
                    )

                    else -> throw Exception("Unknown Feature: key 'numberType' not found or does not match any feature type")
                }

                else -> throw Exception("Unknown Feature: key 'valueType' not found or does not match any feature type")
            }

            FeatureType.VALUE.typeName -> when (json.jsonObject["valueType"]?.jsonPrimitive?.content) {
                ValueType.STRING.typeName -> ValueStringFeature(
                    featureId = featureId,
                    name = name,
                    scheduleType = scheduleType,
                    schedule = schedule,
                    value = json.jsonObject["value"]!!.jsonPrimitive.content.toString()
                )

                ValueType.NUMBER.typeName -> when (json.jsonObject["numberType"]?.jsonPrimitive?.content) {
                    NumberType.INT.typeName -> ValueIntFeature(
                        featureId = featureId,
                        name = name,
                        scheduleType = scheduleType,
                        schedule = schedule,
                        value = json.jsonObject["value"]!!.jsonPrimitive.long
                    )

                    NumberType.FLOAT.typeName -> ValueFloatFeature(
                        featureId = featureId,
                        name = name,
                        scheduleType = scheduleType,
                        schedule = schedule,
                        value = json.jsonObject["value"]!!.jsonPrimitive.double
                    )

                    else -> throw Exception("Unknown Feature: key 'numberType' not found or does not match any feature type")
                }

                else -> throw Exception("Unknown Feature: key 'valueType' not found or does not match any feature type")
            }

            else -> throw Exception("Unknown Feature: key 'featureType' not found or does not match any feature type")
        }
    }

    private fun deserializeGroup(json: JsonElement): Group {

        val environments = mutableMapOf<String, Environment>();
        for (environment in json.jsonObject["environments"]!!.jsonObject.values) {
            val environmentFeatures = mutableMapOf<String, Feature>()
            for (feature in environment.jsonObject["features"]!!.jsonObject.values) {
                environmentFeatures[feature.jsonObject["featureId"]!!.jsonPrimitive.content] =
                    deserializeFeature(feature)
            }
            environments[environment.jsonObject["environmentId"]!!.jsonPrimitive.content] = Environment(
                features = environmentFeatures,
                environmentId = environment.jsonObject["environmentId"]!!.jsonPrimitive.content,
                name = environment.jsonObject["name"]!!.jsonPrimitive.content
            )
        }

        val features = mutableMapOf<String, Feature>()
        for (feature in json.jsonObject["features"]!!.jsonObject.values) {
            features[feature.jsonObject["featureId"]!!.jsonPrimitive.content] = deserializeFeature(feature)
        }

        return Group(
            name = json.jsonObject["name"]!!.jsonPrimitive.content,
            groupId = json.jsonObject["groupId"]!!.jsonPrimitive.content,
            meta = GroupMeta(
                version = json.jsonObject["meta"]!!.jsonObject["version"]!!.jsonPrimitive.content,
            ),
            environments = environments,
            features = features
        )
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
