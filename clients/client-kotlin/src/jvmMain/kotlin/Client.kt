import java.net.URL
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule

enum class VexillaFeatureType(val typeName: String) {
    TOGGLE("toggle"),
    GRADUAL("gradual"),
    SELECTIVE("selective")
}

data class VexillaJsonResponse(
    @JsonProperty("environments") val environments: Map<String, Map<String, Map<String, Any>>>
)

class Client(
    private val baseUrl: String,
    private val environment: String,
    private val customInstanceHash: String?,
) {

    private val mapper = ObjectMapper().registerKotlinModule()
    private lateinit var flags: VexillaJsonResponse

    fun getFlags(fileName: String = "features"): Client {
        val entireJson = URL("$baseUrl$fileName.json").readText()
        println(entireJson)
        this.flags = this.mapper.readValue(entireJson, VexillaJsonResponse::class.java)
        println(this.flags)
        return this
    }

    fun should(featureName: String): Boolean {
        if(this.flags.environments.isNullOrEmpty()) {
            return false
        }

        // untagged is the only featureSet supported at the moment
        var feature = this.flags.environments[this.environment]?.get("untagged")?.get(featureName) as Map<String, Any>

        return when(feature["type"]) {
            VexillaFeatureType.TOGGLE.typeName ->
                feature["value"] as Boolean

            VexillaFeatureType.GRADUAL.typeName ->
                this.getInstancePercentile(feature["seed"] as Double) <= feature["value"] as Int

            else -> {
                println("unsupported type")
                return false
            }
        }
    }

    private fun getInstancePercentile(seed: Double): Double {
        if(this.customInstanceHash.isNullOrEmpty()) {
            throw Exception("this.customInstanceHash must be defined")
        }
        return Hasher(seed).hashString(this.customInstanceHash)
    }
}
