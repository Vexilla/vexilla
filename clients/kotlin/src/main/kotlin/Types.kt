package dev.vexilla

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonClassDiscriminator

enum class FeatureType(val typeName: String) {
    TOGGLE("toggle"),
    GRADUAL("gradual"),
    SELECTIVE("selective"),
    VALUE("value"),
}

enum class ScheduleType(val typeName: String) {
    EMPTY(""),
    GLOBAL("global"),
    ENVIRONMENT("environment"),
}

enum class ScheduleTimeType(val typeName: String) {
    NONE("none"),
    START_END("start/end"),
    DAILY("daily"),
}

enum class ValueType(val typeName: String) {
    STRING("string"),
    NUMBER("number")
}

enum class NumberType(val typeName: String) {
    INT("int"),
    FLOAT("float")
}

@Serializable
data class Schedule(
    val start: Long,
    val end: Long,
    val timezone: String,
    val timeType: ScheduleTimeType,
    val startTime: Long,
    val endTime: Long,
)

@Serializable
data class GroupMeta(
    val version: String
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
@JsonClassDiscriminator("featureType")
sealed class Feature(
    val name: String,
    val featureId: String,
    val featureType: FeatureType,
    val scheduleType: ScheduleType,
    val schedule: Schedule
)

@Serializable
sealed class ToggleFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.TOGGLE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    value: Boolean
) : Feature(name, featureId, featureType, scheduleType, schedule)

@Serializable
sealed class GradualFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.GRADUAL,
    scheduleType: ScheduleType,
    schedule: Schedule,
    val value: Double,
    val seed: Double
) : Feature(name, featureId, featureType, scheduleType, schedule)

@OptIn(ExperimentalSerializationApi::class)
@JsonClassDiscriminator("valueType")
sealed class SelectiveFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.SELECTIVE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    val valueType: ValueType
) : Feature(name, featureId, featureType, scheduleType, schedule)

class SelectiveStringFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.SELECTIVE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    val value: List<String>,
    valueType: ValueType = ValueType.STRING
) : SelectiveFeature(name, featureId, featureType, scheduleType, schedule, valueType)

class SelectiveIntFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.SELECTIVE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    valueType: ValueType = ValueType.NUMBER,
    val numberType: NumberType = NumberType.INT,
    val value: List<Long>,
) : SelectiveFeature(name, featureId, featureType, scheduleType, schedule, valueType)

class SelectiveFloatFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.SELECTIVE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    valueType: ValueType = ValueType.NUMBER,
    val numberType: NumberType = NumberType.FLOAT,
    val value: List<Double>,
) : SelectiveFeature(name, featureId, featureType, scheduleType, schedule, valueType)

@OptIn(ExperimentalSerializationApi::class)
@JsonClassDiscriminator("valueType")
sealed class ValueFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.VALUE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    val valueType: ValueType
) : Feature(name, featureId, featureType, scheduleType, schedule)

class ValueStringFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.VALUE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    val value: String,
    valueType: ValueType = ValueType.STRING
) : ValueFeature(name, featureId, featureType, scheduleType, schedule, valueType)

class ValueIntFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.VALUE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    valueType: ValueType = ValueType.NUMBER,
    val numberType: NumberType = NumberType.INT,
    val value: Long,
) : ValueFeature(name, featureId, featureType, scheduleType, schedule, valueType)

class ValueFloatFeature(
    name: String,
    featureId: String,
    featureType: FeatureType = FeatureType.VALUE,
    scheduleType: ScheduleType,
    schedule: Schedule,
    valueType: ValueType = ValueType.NUMBER,
    val numberType: NumberType = NumberType.FLOAT,
    val value: Double,
) : ValueFeature(name, featureId, featureType, scheduleType, schedule, valueType)

@Serializable
data class ManifestGroup(
    val name: String,
    val groupId: String
)

@Serializable
data class Manifest(
    val version: String,
    val groups: List<ManifestGroup>
)

// the Base Environment if we need to mimic the Go code implementation
@Serializable
sealed class Environment(
    val name: String,
    val environmentId: String,
    val features: Map<String, Feature>
)

@Serializable
data class Group(
    val name: String,
    val groupId: String,
    val meta: GroupMeta,
    val environments: Map<String, Environment>,
    val features: Map<String, Feature>
)
