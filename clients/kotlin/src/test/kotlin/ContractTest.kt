import dev.vexilla.*
import java.io.File
import java.net.URI
import kotlin.test.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.*
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test

class ContractTest {
    private val root
        get(): File {
            val supplied = System.getenv("VEXILLA_CONTRACT_DIR")
            val folder = File(supplied ?: "../../.contract-artifacts")
            if (supplied == null) {
                assumeTrue(
                    File(folder, "metadata.json").isFile,
                    "Use contract/scripts/run.cjs for immutable shared artifacts",
                )
            }
            return folder
        }

    private fun read(name: String) = Json.parseToJsonElement(File(root, name).readText())

    private fun JsonObject.text(key: String) = getValue(key).jsonPrimitive.content

    private fun instance(v: JsonElement?): Any? =
        when (v) {
            null,
            JsonNull -> null
            is JsonPrimitive ->
                if (v.isString) {
                    v.content
                } else {
                    v.booleanOrNull ?: v.doubleOrNull ?: v
                }
            else -> v
        }

    private fun json(v: Any?): JsonElement =
        when (v) {
            null,
            Unit -> JsonNull
            is JsonElement -> v
            is Boolean -> JsonPrimitive(v)
            is Number -> JsonPrimitive(v)
            is String -> JsonPrimitive(v)
            is Manifest -> VexillaCodec.json(v)
            is Group -> VexillaCodec.json(v)
            else -> error("Unexpected result $v")
        }

    private suspend fun outcome(block: suspend () -> Any?): JsonObject =
        try {
            buildJsonObject { put("value", json(block())) }
        } catch (e: ContractException) {
            buildJsonObject { put("error", e.kind) }
        } catch (e: SerializationException) {
            buildJsonObject { put("error", "validation") }
        }

    private fun equal(a: JsonElement, b: JsonElement): Boolean {
        if (
            a is JsonPrimitive &&
                b is JsonPrimitive &&
                !a.isString &&
                !b.isString &&
                a.doubleOrNull != null &&
                b.doubleOrNull != null
        ) {
            return a.double == b.double
        }
        if (a is JsonArray && b is JsonArray) {
            return a.size == b.size && a.indices.all { equal(a[it], b[it]) }
        }
        if (a is JsonObject && b is JsonObject) {
            return a.keys == b.keys && a.keys.all { equal(a.getValue(it), b.getValue(it)) }
        }
        return a == b
    }

    private fun tokens(p: String) =
        p.drop(1).split('/').map { it.replace("~1", "/").replace("~0", "~") }

    private fun at(v: JsonElement, p: String): JsonElement =
        tokens(p).fold(v) { a, k ->
            if (a is JsonArray) {
                a[k.toInt()]
            } else {
                a.jsonObject.getValue(k)
            }
        }

    private fun update(
        v: JsonElement,
        keys: List<String>,
        value: JsonElement?,
        remove: Boolean,
    ): JsonElement {
        val key = keys.first()
        if (v is JsonArray) {
            val items = v.toMutableList()
            val index = key.toInt()
            if (keys.size == 1) {
                if (remove) {
                    items.removeAt(index)
                } else if (index == items.size) {
                    items.add(value!!)
                } else {
                    items[index] = value!!
                }
            } else {
                items[index] = update(items[index], keys.drop(1), value, remove)
            }
            return JsonArray(items)
        }
        val items = v.jsonObject.toMutableMap()
        if (keys.size == 1) {
            if (remove) {
                items.remove(key)
            } else {
                items[key] = value!!
            }
        } else {
            items[key] = update(items.getValue(key), keys.drop(1), value, remove)
        }
        return JsonObject(items)
    }

    private fun mutate(original: JsonElement, mutations: JsonArray): JsonElement {
        var v = original
        for (raw in mutations) {
            val m = raw.jsonObject
            val value =
                when {
                    m.text("op") == "remove" -> null
                    m.text("op") == "copy" -> at(v, m.text("from"))
                    "wireString" in m -> Json.parseToJsonElement(m.text("wireString"))
                    "nativeNumber" in m ->
                        JsonPrimitive(
                            when (m.text("nativeNumber")) {
                                "NaN" -> Double.NaN
                                "Infinity" -> Double.POSITIVE_INFINITY
                                else -> Double.NEGATIVE_INFINITY
                            }
                        )
                    else -> m.getValue("value")
                }
            v = update(v, tokens(m.text("path")), value, m.text("op") == "remove")
        }
        return v
    }

    private val fetch: suspend (String) -> String = {
        File(root, URI(it).path.substringAfterLast('/')).readText()
    }

    @Test
    fun sharedContract() = runBlocking {
        val parity = read("parity.json").jsonObject
        val expected = read("expected.json").jsonObject
        val observations = mutableListOf<JsonElement>()
        val expectations = mutableMapOf<String, JsonElement>()
        fun observe(id: String, result: JsonElement, expect: JsonElement) {
            assertTrue(equal(result, expect), "$id\nExpected $expect\nActual   $result")
            expectations[id] = expect
            observations.add(
                buildJsonObject {
                    put("caseId", id)
                    put("outcome", result)
                }
            )
        }
        fun value(v: Any?) = buildJsonObject { put("value", json(v)) }
        for (raw in parity.getValue("hashes").jsonArray) {
            val s = raw.jsonObject
            observe(
                s.text("id"),
                value(Hasher.hashFnv32a(s.text("text")).toLong()),
                s.getValue("expected"),
            )
        }
        for (raw in parity.getValue("numbers").jsonArray) {
            val s = raw.jsonObject
            val text = Hasher.instanceText(instance(s["instance"]))
            observe(
                s.text("id"),
                value(
                    buildJsonObject {
                        put("text", text)
                        put("hash", Hasher.hashFnv32a(text).toLong())
                    }
                ),
                s.getValue("expected"),
            )
        }
        for (raw in parity.getValue("gradual").jsonArray) {
            val s = raw.jsonObject
            val c = Client("https://contract", "prod", "member")
            c.syncManifest(fetch)
            val group =
                update(
                    read("contract-group.json"),
                    listOf("environments", "prod", "features", "gradual", "seed"),
                    s.getValue("seed"),
                    false,
                )
            c.setFlags(
                VexillaCodec.group(
                    update(
                        group,
                        listOf("environments", "prod", "features", "gradual", "value"),
                        s.getValue("threshold"),
                        false,
                    )
                )
            )
            observe(
                s.text("id"),
                value(
                    buildJsonObject {
                        put(
                            "bucket",
                            Hasher.hashString(
                                Hasher.instanceText(instance(s["instance"])),
                                s.getValue("seed").jsonPrimitive.double,
                            ),
                        )
                        put(
                            "enabled",
                            c.shouldCustom(
                                    expected.text("groupId"),
                                    "gradual",
                                    instance(s["instance"]),
                                )
                                .getOrThrow(),
                        )
                    }
                ),
                s.getValue("expected"),
            )
        }
        for (raw in parity.getValue("schedules").jsonArray) {
            val s = raw.jsonObject
            observe(
                s.text("id"),
                value(
                    Scheduler.isScheduleActiveMillis(
                        VexillaCodec.schedule(s.getValue("schedule")),
                        ScheduleType.values().first { it.typeName == s.text("scheduleType") },
                        s.getValue("now").jsonPrimitive.long,
                    )
                ),
                s.getValue("expected"),
            )
        }
        for (raw in parity.getValue("validation").jsonArray) {
            val s = raw.jsonObject
            val results = mutableListOf<JsonObject>()
            for (fetched in listOf(false, true)) {
                results.add(
                    outcome {
                        val c = Client("https://contract", "prod", "member")
                        val source =
                            mutate(
                                    buildJsonObject {
                                        put("manifest", read("manifest.json"))
                                        put(
                                            "groups",
                                            buildJsonObject {
                                                put(
                                                    expected.text("groupId"),
                                                    read("contract-group.json"),
                                                )
                                            },
                                        )
                                    },
                                    s.getValue("mutations").jsonArray,
                                )
                                .jsonObject
                        if (fetched) {
                            val bytes = source.getValue("manifest").toString()
                            c.syncManifest { bytes }
                        } else {
                            c.setManifest(VexillaCodec.manifest(source.getValue("manifest")))
                        }
                        for ((id, g) in source.getValue("groups").jsonObject) {
                            if (fetched) {
                                val bytes = g.toString()
                                c.syncFlags(id) { bytes }
                            } else {
                                c.setFlags(VexillaCodec.group(g))
                            }
                        }
                        true
                    }
                )
            }
            assertTrue(equal(results[0], results[1]), s.text("id") + "/ingestion")
            observe(s.text("id"), results[0], s.getValue("expected"))
        }
        for (raw in parity.getValue("operations").jsonArray) {
            val s = raw.jsonObject
            val clients = mutableMapOf<String, Client>()
            val data = mutableMapOf<String, JsonElement>()
            val results = mutableListOf<JsonElement>()
            for (rawStep in s.getValue("steps").jsonArray) {
                val step = rawStep.jsonObject
                results.add(
                    outcome {
                        val c = step["client"]?.let { clients[it.jsonPrimitive.content] }
                        val callback: suspend (String) -> String = {
                            val cb = step.getValue("callback").jsonObject
                            if (cb["throws"]?.jsonPrimitive?.booleanOrNull == true) {
                                throw IllegalStateException("Transport failure")
                            }
                            (if ("file" in cb) {
                                    read(cb.text("file"))
                                } else {
                                    data.getValue(cb.text("data"))
                                })
                                .toString()
                        }
                        when (step.text("op")) {
                            "load" -> {
                                data[step.text("as")] = read(step.text("file"))
                                Unit
                            }
                            "new" -> {
                                clients[step.text("client")] =
                                    Client(
                                        "https://contract",
                                        step.text("environment"),
                                        instance(step["instance"]),
                                    )
                                Unit
                            }
                            "mutate" -> {
                                data[step.text("data")] =
                                    mutate(
                                        data.getValue(step.text("data")),
                                        step.getValue("mutations").jsonArray,
                                    )
                                Unit
                            }
                            "setManifest" -> {
                                c!!.setManifest(
                                    VexillaCodec.manifest(data.getValue(step.text("data")))
                                )
                                Unit
                            }
                            "setFlags" -> {
                                c!!.setFlags(VexillaCodec.group(data.getValue(step.text("data"))))
                                Unit
                            }
                            "getManifest" -> {
                                data[step.text("as")] = VexillaCodec.json(c!!.getManifest(callback))
                                Unit
                            }
                            "getFlags" -> {
                                data[step.text("as")] =
                                    VexillaCodec.json(c!!.getFlags(step.text("group"), callback))
                                Unit
                            }
                            "syncManifest" -> {
                                c!!.syncManifest(callback)
                                Unit
                            }
                            "syncFlags" -> {
                                c!!.syncFlags(step.text("group"), callback)
                                Unit
                            }
                            "should" ->
                                if ("instance" in step) {
                                    c!!
                                        .shouldCustom(
                                            step.text("group"),
                                            step.text("feature"),
                                            instance(step["instance"]),
                                        )
                                        .getOrThrow()
                                } else {
                                    c!!
                                        .should(step.text("group"), step.text("feature"))
                                        .getOrThrow()
                                }
                            "value" ->
                                c!!
                                    .value(
                                        step.text("group"),
                                        step.text("feature"),
                                        instance(step["default"]),
                                    )
                                    .getOrThrow()
                            else -> error("Unknown operation")
                        }
                    }
                )
            }
            observe(s.text("id"), value(JsonArray(results)), s.getValue("expected"))
        }
        for (raw in parity.getValue("aliases").jsonArray) {
            val s = raw.jsonObject
            observe(
                s.text("id"),
                value(Compatibility.normalize(s.text("name"))),
                s.getValue("expected"),
            )
        }
        for (raw in parity.getValue("timezones").jsonArray) {
            val s = raw.jsonObject
            val c = Client("https://contract", "prod", "member")
            c.syncManifest(fetch)
            val group =
                update(
                    read("contract-group.json"),
                    listOf("features", "toggle", "schedule", "timezone"),
                    s.getValue("timezone"),
                    false,
                )
            val result = outcome {
                c.setFlags(VexillaCodec.group(group))
                true
            }
            observe(s.text("id"), value("value" in result), s.getValue("expected"))
        }
        for (rawEnv in expected.getValue("environments").jsonArray) {
            val env = rawEnv.jsonObject
            for (lookup in listOf("id", "name", "alias")) {
                fun name(id: String, label: String) =
                    when (lookup) {
                        "id" -> id
                        "name" -> label
                        else -> Compatibility.normalize(label)
                    }
                val c = Client("https://contract", name(env.text("id"), env.text("name")), "member")
                c.syncManifest(fetch)
                c.syncFlags(expected.text("groupId"), fetch)
                val group = name(expected.text("groupId"), expected.text("groupName"))
                expected.getValue("cases").jsonArray.forEachIndexed { index, rawCase ->
                    val sample = rawCase.jsonObject
                    val feature = name(sample.text("id"), sample.text("name"))
                    observe(
                        "publication/${env.text("id")}/$lookup/$index",
                        outcome {
                            if (sample.text("kind") == "value") {
                                c.value(group, feature, "fallback").getOrThrow()
                            } else {
                                c.shouldCustom(group, feature, instance(sample["instance"]))
                                    .getOrThrow()
                            }
                        },
                        value(instance(env[sample.text("expectedKey")])),
                    )
                }
                val decoded = VexillaCodec.group(read("contract-group.json"))
                for (fid in
                    expected.getValue("scheduled").jsonArray.map { it.jsonPrimitive.content } +
                        "scheduled-active") {
                    val f = decoded.environments.getValue(env.text("id")).features.getValue(fid)
                    observe(
                        "publication/${env.text("id")}/$lookup/schedule/$fid",
                        value(
                            Scheduler.isScheduleActiveMillis(
                                f.schedule,
                                f.scheduleType,
                                expected.getValue("referenceClock").jsonPrimitive.long,
                            )
                        ),
                        value(fid == "scheduled-active"),
                    )
                }
            }
        }
        assertEquals(expectations.size, observations.size)
        System.getenv("VEXILLA_OBSERVATIONS_FILE")?.let {
            File(it)
                .writeText(
                    buildJsonObject {
                            put("protocol", 1)
                            put("sdk", "kotlin")
                            put(
                                "runs",
                                buildJsonArray {
                                    add(
                                        buildJsonObject {
                                            put("runtime", "native")
                                            put("observations", JsonArray(observations))
                                        }
                                    )
                                },
                            )
                        }
                        .toString()
                )
        }
        Unit
    }

    @Test
    fun exactBinary64Formatting() {
        val rows =
            Json.parseToJsonElement(javaClass.getResource("/numeric-regressions.json")!!.readText())
                .jsonArray
        for (raw in rows) {
            val r = raw.jsonObject
            val number =
                java.lang.Double.longBitsToDouble(
                    java.lang.Long.parseUnsignedLong(r.text("bits"), 16)
                )
            assertEquals(r.text("text"), Hasher.instanceText(number), r.text("bits"))
        }
    }

    @Test
    fun nativeSnapshotsAndMalformedValues() = runBlocking {
        // Check artifact availability before the SDK wraps transport exceptions.
        assertTrue(File(root, "metadata.json").isFile)
        val c = Client("https://contract", "prod", "member")
        c.syncManifest(fetch)
        val g = VexillaCodec.group(read("contract-group.json"))
        val envs = g.environments.toMutableMap()
        val features = g.environments.getValue("prod").features.toMutableMap()
        envs["prod"] = g.environments.getValue("prod").copy(features = features)
        c.setFlags(g.copy(environments = envs))
        features.clear()
        envs.clear()
        assertEquals(true, c.should("contract-group", "toggle").getOrThrow())
        for (bad in
            listOf(
                null,
                true,
                Double.NaN,
                Double.POSITIVE_INFINITY,
                9007199254740993L,
                "\ud800",
                "\udfff",
            )) {
            val error = c.shouldCustom("contract-group", "gradual", bad).exceptionOrNull()
            assertEquals("instance", (error as ContractException).kind)
        }
        val original = g.environments.getValue("prod")
        val f = original.features.getValue("value-float")
        val invalid =
            ValueFloatFeature(
                f.name,
                f.featureId,
                scheduleType = f.scheduleType,
                schedule = f.schedule,
                value = Double.NaN,
            )
        assertFailsWith<ContractException> {
            c.setFlags(
                g.copy(
                    environments =
                        g.environments +
                            ("prod" to
                                original.copy(
                                    features = original.features + ("value-float" to invalid)
                                ))
                )
            )
        }
        assertEquals(true, c.should("contract-group", "toggle").getOrThrow())
        for (wire in listOf("\\ud800", "\\udfff", "\\ud800x")) {
            assertFailsWith<ContractException> {
                c.getManifest { "{\"version\":\"v1\",\"groups\":[],\"extra\":\"$wire\"}" }
            }
        }
    }
}
