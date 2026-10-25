package dev.vexilla

import kotlinx.serialization.json.*

object Validation {
    fun check(ok: Boolean, message: String) {
        if (!ok) {
            throw ContractException("validation", message)
        }
    }

    fun obj(value: JsonElement?): JsonObject =
        value as? JsonObject ?: throw ContractException("validation", "Expected an object")

    fun array(value: JsonElement?): JsonArray =
        value as? JsonArray ?: throw ContractException("validation", "Expected an array")

    fun text(value: JsonElement?, nonempty: Boolean = false): String {
        val p = value as? JsonPrimitive
        check(p != null && p.isString && (!nonempty || p.content.isNotEmpty()), "Expected a string")
        return p!!.content
    }

    fun number(value: JsonElement?, integer: Boolean = false): Double {
        val p = value as? JsonPrimitive
        val n =
            if (p != null && !p.isString && p.booleanOrNull == null) {
                p.doubleOrNull
            } else {
                null
            }
        check(
            n != null &&
                n.isFinite() &&
                (!integer || n % 1.0 == 0.0 && kotlin.math.abs(n) <= 9007199254740991.0),
            "Expected a finite number within the field's integer bounds",
        )
        return n!!
    }

    fun unicode(value: JsonElement) {
        when (value) {
            is JsonObject ->
                value.forEach { (key, item) ->
                    check(Compatibility.isUnicode(key), "Malformed Unicode key")
                    unicode(item)
                }
            is JsonArray -> value.forEach(::unicode)
            is JsonPrimitive ->
                if (value.isString) {
                    check(Compatibility.isUnicode(value.content), "Malformed Unicode string")
                }
        }
    }

    private fun member(value: JsonElement?, vararg allowed: String) {
        check(text(value) in allowed, "Unsupported enum")
    }

    private fun safeID(value: JsonElement?): String {
        val id = text(value, true)
        check(
            id !in listOf("manifest", "config", ".", "..") &&
                id.none { it == '/' || it == '\\' || it == '\u0000' },
            "Unsafe group file identifier",
        )
        return id
    }

    fun addAlias(aliases: MutableMap<String, String>, id: String, name: String) {
        for (key in listOf(id, name, Compatibility.normalize(name))) {
            check(aliases[key] == null || aliases[key] == id, "Alias shadows another ID/name")
            aliases[key] = id
        }
    }

    fun schedule(value: JsonElement) {
        unicode(value)
        val s = obj(value)
        for (key in listOf("start", "end", "startTime", "endTime")) {
            number(s[key], true)
        }
        member(s["timeType"], "none", "start/end", "daily")
        check(Compatibility.timezone(text(s["timezone"], true)), "Invalid timezone")
    }

    fun feature(value: JsonElement) {
        unicode(value)
        val feature = obj(value)
        text(feature["name"])
        text(feature["featureId"], true)
        member(feature["scheduleType"], "", "global", "environment")
        schedule(feature["schedule"] ?: JsonNull)
        when (text(feature["featureType"])) {
            "toggle" ->
                check(
                    (feature["value"] as? JsonPrimitive)?.let {
                        !it.isString && it.booleanOrNull != null
                    } == true,
                    "Toggle value must be boolean",
                )
            "gradual" -> {
                number(feature["value"])
                val seed = number(feature["seed"])
                check(seed > 0 && seed <= 1, "seed must satisfy 0 < seed <= 1")
            }
            "selective",
            "value" -> {
                member(feature["valueType"], "string", "number")
                val numeric = text(feature["valueType"]) == "number"
                if (numeric) {
                    member(feature["numberType"], "int", "float")
                }
                val integer = numeric && text(feature["numberType"]) == "int"
                fun item(value: JsonElement?) {
                    if (numeric) {
                        number(value, integer)
                    } else {
                        text(value)
                    }
                }
                if (text(feature["featureType"]) == "selective") {
                    array(feature["value"]).forEach(::item)
                } else {
                    item(feature["value"])
                }
            }
            else -> throw ContractException("validation", "Unsupported featureType")
        }
    }

    private fun features(value: JsonElement?): JsonObject {
        val fields = obj(value)
        val aliases = mutableMapOf<String, String>()
        for ((id, raw) in fields) {
            feature(raw)
            val feature = obj(raw)
            check(text(feature["featureId"], true) == id, "featureId differs from map key")
            addAlias(aliases, id, text(feature["name"]))
        }
        return fields
    }

    fun manifest(value: JsonElement) {
        unicode(value)
        val manifest = obj(value)
        check(text(manifest["version"]) == "v1", "Manifest version must be v1")
        val ids = mutableSetOf<String>()
        val aliases = mutableMapOf<String, String>()
        for (raw in array(manifest["groups"])) {
            val group = obj(raw)
            val id = safeID(group["groupId"])
            check(ids.add(id), "Duplicate group ID")
            addAlias(aliases, id, text(group["name"]))
        }
    }

    private fun same(left: JsonElement?, right: JsonElement?): Boolean {
        if (left == null || right == null) {
            return left == null && right == null
        }
        if (left is JsonNull || right is JsonNull) {
            return left is JsonNull && right is JsonNull
        }
        if (left !is JsonPrimitive || right !is JsonPrimitive || left.isString != right.isString) {
            return false
        }
        if (left.isString) {
            return left.content == right.content
        }
        if (left.booleanOrNull != null || right.booleanOrNull != null) {
            return left.booleanOrNull != null && left.booleanOrNull == right.booleanOrNull
        }
        return left.doubleOrNull == right.doubleOrNull
    }

    fun group(value: JsonElement) {
        unicode(value)
        val group = obj(value)
        safeID(group["groupId"])
        text(group["name"])
        check(text(obj(group["meta"])["version"]) == "v1", "Group version must be v1")
        val defaults = features(group["features"])
        val aliases = mutableMapOf<String, String>()
        for ((id, raw) in obj(group["environments"])) {
            val env = obj(raw)
            check(text(env["environmentId"], true) == id, "environmentId differs from map key")
            addAlias(aliases, id, text(env["name"]))
            val values = features(env["features"])
            check(values.keys == defaults.keys, "Environment feature set differs")
            for ((featureId, feature) in values) {
                val left = obj(feature)
                val right = obj(defaults.getValue(featureId))
                for (key in listOf("name", "featureType", "valueType", "numberType")) {
                    check(
                        same(left[key], right[key]),
                        "Environment feature identity/subtype differs",
                    )
                }
            }
        }
    }
}
