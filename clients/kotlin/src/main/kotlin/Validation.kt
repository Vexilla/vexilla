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
        val f = obj(value)
        text(f["name"])
        text(f["featureId"], true)
        member(f["scheduleType"], "", "global", "environment")
        schedule(f["schedule"] ?: JsonNull)
        when (text(f["featureType"])) {
            "toggle" ->
                check(
                    (f["value"] as? JsonPrimitive)?.let {
                        !it.isString && it.booleanOrNull != null
                    } == true,
                    "Toggle value must be boolean",
                )
            "gradual" -> {
                number(f["value"])
                val seed = number(f["seed"])
                check(seed > 0 && seed <= 1, "seed must satisfy 0 < seed <= 1")
            }
            "selective",
            "value" -> {
                member(f["valueType"], "string", "number")
                val numeric = text(f["valueType"]) == "number"
                if (numeric) {
                    member(f["numberType"], "int", "float")
                }
                val integer = numeric && text(f["numberType"]) == "int"
                fun item(v: JsonElement?) {
                    if (numeric) {
                        number(v, integer)
                    } else {
                        text(v)
                    }
                }
                if (text(f["featureType"]) == "selective") {
                    array(f["value"]).forEach(::item)
                } else {
                    item(f["value"])
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
            val f = obj(raw)
            check(text(f["featureId"], true) == id, "featureId differs from map key")
            addAlias(aliases, id, text(f["name"]))
        }
        return fields
    }

    fun manifest(value: JsonElement) {
        unicode(value)
        val m = obj(value)
        check(text(m["version"]) == "v1", "Manifest version must be v1")
        val ids = mutableSetOf<String>()
        val aliases = mutableMapOf<String, String>()
        for (raw in array(m["groups"])) {
            val group = obj(raw)
            val id = safeID(group["groupId"])
            check(ids.add(id), "Duplicate group ID")
            addAlias(aliases, id, text(group["name"]))
        }
    }

    private fun same(a: JsonElement?, b: JsonElement?): Boolean {
        if (a == null || b == null) {
            return a == null && b == null
        }
        if (a is JsonNull || b is JsonNull) {
            return a is JsonNull && b is JsonNull
        }
        if (a !is JsonPrimitive || b !is JsonPrimitive || a.isString != b.isString) {
            return false
        }
        if (a.isString) {
            return a.content == b.content
        }
        if (a.booleanOrNull != null || b.booleanOrNull != null) {
            return a.booleanOrNull != null && a.booleanOrNull == b.booleanOrNull
        }
        return a.doubleOrNull == b.doubleOrNull
    }

    fun group(value: JsonElement) {
        unicode(value)
        val g = obj(value)
        safeID(g["groupId"])
        text(g["name"])
        check(text(obj(g["meta"])["version"]) == "v1", "Group version must be v1")
        val defaults = features(g["features"])
        val aliases = mutableMapOf<String, String>()
        for ((id, raw) in obj(g["environments"])) {
            val env = obj(raw)
            check(text(env["environmentId"], true) == id, "environmentId differs from map key")
            addAlias(aliases, id, text(env["name"]))
            val values = features(env["features"])
            check(values.keys == defaults.keys, "Environment feature set differs")
            for ((fid, feature) in values) {
                val a = obj(feature)
                val b = obj(defaults.getValue(fid))
                for (key in listOf("name", "featureType", "valueType", "numberType")) {
                    check(same(a[key], b[key]), "Environment feature identity/subtype differs")
                }
            }
        }
    }
}
