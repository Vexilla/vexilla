package dev.vexilla

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.*

object VexillaCodec {
    fun parse(text: String): JsonElement =
        try {
            Json.parseToJsonElement(text)
        } catch (e: SerializationException) {
            throw ContractException("validation", "Invalid JSON: " + e.message)
        }

    fun decodeManifest(text: String) = manifest(parse(text))

    fun decodeGroup(text: String) = group(parse(text))

    fun manifest(value: JsonElement): Manifest {
        Validation.manifest(value)
        val manifestProperties = value.jsonObject
        return Manifest(
            Validation.text(manifestProperties["version"]),
            manifestProperties.getValue("groups").jsonArray.map {
                val groupProperties = it.jsonObject
                ManifestGroup(
                    Validation.text(groupProperties["name"]),
                    Validation.text(groupProperties["groupId"]),
                )
            },
        )
    }

    fun schedule(value: JsonElement): Schedule {
        Validation.schedule(value)
        val scheduleProperties = value.jsonObject
        return Schedule(
            Validation.number(scheduleProperties["start"], true).toLong(),
            Validation.number(scheduleProperties["end"], true).toLong(),
            Validation.text(scheduleProperties["timezone"]),
            ScheduleTimeType.values().first {
                it.typeName == Validation.text(scheduleProperties["timeType"])
            },
            Validation.number(scheduleProperties["startTime"], true).toLong(),
            Validation.number(scheduleProperties["endTime"], true).toLong(),
        )
    }

    fun feature(value: JsonElement): Feature {
        Validation.feature(value)
        val featureProperties = value.jsonObject
        val name = Validation.text(featureProperties["name"])
        val id = Validation.text(featureProperties["featureId"])
        val mode =
            ScheduleType.values().first {
                it.typeName == Validation.text(featureProperties["scheduleType"])
            }
        val schedule = schedule(featureProperties.getValue("schedule"))
        val data = featureProperties.getValue("value")
        return when (Validation.text(featureProperties["featureType"])) {
            "toggle" ->
                ToggleFeature(
                    name,
                    id,
                    scheduleType = mode,
                    schedule = schedule,
                    value = data.jsonPrimitive.boolean,
                )
            "gradual" ->
                GradualFeature(
                    name,
                    id,
                    scheduleType = mode,
                    schedule = schedule,
                    value = Validation.number(data),
                    seed = Validation.number(featureProperties["seed"]),
                )
            "selective" ->
                when (Validation.text(featureProperties["valueType"])) {
                    "string" ->
                        SelectiveStringFeature(
                            name,
                            id,
                            scheduleType = mode,
                            schedule = schedule,
                            value = data.jsonArray.map { Validation.text(it) },
                        )
                    else ->
                        if (Validation.text(featureProperties["numberType"]) == "int") {
                            SelectiveIntFeature(
                                name,
                                id,
                                scheduleType = mode,
                                schedule = schedule,
                                value = data.jsonArray.map { Validation.number(it, true).toLong() },
                            )
                        } else {
                            SelectiveFloatFeature(
                                name,
                                id,
                                scheduleType = mode,
                                schedule = schedule,
                                value = data.jsonArray.map { Validation.number(it) },
                            )
                        }
                }
            else ->
                when (Validation.text(featureProperties["valueType"])) {
                    "string" ->
                        ValueStringFeature(
                            name,
                            id,
                            scheduleType = mode,
                            schedule = schedule,
                            value = Validation.text(data),
                        )
                    else ->
                        if (Validation.text(featureProperties["numberType"]) == "int") {
                            ValueIntFeature(
                                name,
                                id,
                                scheduleType = mode,
                                schedule = schedule,
                                value = Validation.number(data, true).toLong(),
                            )
                        } else {
                            ValueFloatFeature(
                                name,
                                id,
                                scheduleType = mode,
                                schedule = schedule,
                                value = Validation.number(data),
                            )
                        }
                }
        }
    }

    private fun features(value: JsonElement) = value.jsonObject.mapValues { feature(it.value) }

    fun group(value: JsonElement): Group {
        Validation.group(value)
        val groupProperties = value.jsonObject
        return Group(
            Validation.text(groupProperties["name"]),
            Validation.text(groupProperties["groupId"]),
            GroupMeta("v1"),
            groupProperties.getValue("environments").jsonObject.mapValues { (_, raw) ->
                val environmentProperties = raw.jsonObject
                Environment(
                    Validation.text(environmentProperties["name"]),
                    Validation.text(environmentProperties["environmentId"]),
                    features(environmentProperties.getValue("features")),
                )
            },
            features(groupProperties.getValue("features")),
        )
    }

    fun json(value: Schedule): JsonObject = buildJsonObject {
        put("start", value.start)
        put("end", value.end)
        put("startTime", value.startTime)
        put("endTime", value.endTime)
        put("timezone", value.timezone)
        put("timeType", value.timeType.typeName)
    }

    fun json(value: Manifest): JsonObject = buildJsonObject {
        put("version", value.version)
        put(
            "groups",
            JsonArray(
                value.groups.map { groupProperties ->
                    buildJsonObject {
                        put("name", groupProperties.name)
                        put("groupId", groupProperties.groupId)
                    }
                }
            ),
        )
    }

    fun json(value: Feature): JsonObject = buildJsonObject {
        val kind =
            when (value) {
                is ToggleFeature -> "toggle"
                is GradualFeature -> "gradual"
                is SelectiveFeature -> "selective"
                is ValueFeature -> "value"
            }
        Validation.check(
            value.featureType.typeName == kind,
            "Native feature discriminator differs from subtype",
        )
        put("name", value.name)
        put("featureId", value.featureId)
        put("featureType", kind)
        put("scheduleType", value.scheduleType.typeName)
        put("schedule", json(value.schedule))
        fun subtype(actual: ValueType, expected: ValueType) {
            Validation.check(actual == expected, "Native value subtype mismatch")
            put("valueType", actual.typeName)
        }
        when (value) {
            is ToggleFeature -> put("value", value.value)
            is GradualFeature -> {
                put("value", value.value)
                put("seed", value.seed)
            }
            is SelectiveStringFeature -> {
                subtype(value.valueType, ValueType.STRING)
                put("value", JsonArray(value.value.map(::JsonPrimitive)))
            }
            is SelectiveIntFeature -> {
                subtype(value.valueType, ValueType.NUMBER)
                Validation.check(
                    value.numberType == NumberType.INT,
                    "Native number subtype mismatch",
                )
                put("numberType", "int")
                put("value", JsonArray(value.value.map(::JsonPrimitive)))
            }
            is SelectiveFloatFeature -> {
                subtype(value.valueType, ValueType.NUMBER)
                Validation.check(
                    value.numberType == NumberType.FLOAT,
                    "Native number subtype mismatch",
                )
                put("numberType", "float")
                put("value", JsonArray(value.value.map(::JsonPrimitive)))
            }
            is ValueStringFeature -> {
                subtype(value.valueType, ValueType.STRING)
                put("value", value.value)
            }
            is ValueIntFeature -> {
                subtype(value.valueType, ValueType.NUMBER)
                Validation.check(
                    value.numberType == NumberType.INT,
                    "Native number subtype mismatch",
                )
                put("numberType", "int")
                put("value", value.value)
            }
            is ValueFloatFeature -> {
                subtype(value.valueType, ValueType.NUMBER)
                Validation.check(
                    value.numberType == NumberType.FLOAT,
                    "Native number subtype mismatch",
                )
                put("numberType", "float")
                put("value", value.value)
            }
        }
    }

    fun json(value: Group): JsonObject = buildJsonObject {
        put("name", value.name)
        put("groupId", value.groupId)
        put("meta", buildJsonObject { put("version", value.meta.version) })
        put("features", JsonObject(value.features.mapValues { json(it.value) }))
        put(
            "environments",
            JsonObject(
                value.environments.mapValues { (_, environmentProperties) ->
                    buildJsonObject {
                        put("name", environmentProperties.name)
                        put("environmentId", environmentProperties.environmentId)
                        put(
                            "features",
                            JsonObject(environmentProperties.features.mapValues { json(it.value) }),
                        )
                    }
                }
            ),
        )
    }
}

object ManifestSerializer : KSerializer<Manifest> {
    override val descriptor: SerialDescriptor = JsonObject.serializer().descriptor

    override fun deserialize(decoder: Decoder): Manifest =
        VexillaCodec.manifest(
            (decoder as? JsonDecoder
                    ?: throw ContractException("validation", "JSON decoder required"))
                .decodeJsonElement()
        )

    override fun serialize(encoder: Encoder, value: Manifest) {
        val raw = VexillaCodec.json(value)
        Validation.manifest(raw)
        (encoder as? JsonEncoder ?: throw ContractException("validation", "JSON encoder required"))
            .encodeJsonElement(raw)
    }
}

object ScheduleSerializer : KSerializer<Schedule> {
    override val descriptor: SerialDescriptor = JsonObject.serializer().descriptor

    override fun deserialize(decoder: Decoder): Schedule =
        VexillaCodec.schedule(
            (decoder as? JsonDecoder
                    ?: throw ContractException("validation", "JSON decoder required"))
                .decodeJsonElement()
        )

    override fun serialize(encoder: Encoder, value: Schedule) {
        val raw = VexillaCodec.json(value)
        Validation.schedule(raw)
        (encoder as? JsonEncoder ?: throw ContractException("validation", "JSON encoder required"))
            .encodeJsonElement(raw)
    }
}
