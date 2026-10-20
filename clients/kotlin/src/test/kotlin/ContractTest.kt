import dev.vexilla.Scheduler
import kotlinx.datetime.Instant
import dev.vexilla.Client
import dev.vexilla.GradualFeature
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assumptions.assumeTrue
import java.io.File
import java.net.URI
import kotlin.test.*

class ContractTest {
  private fun contractRoot(): File {
    val directory = System.getenv("VEXILLA_CONTRACT_DIR")
    assumeTrue(!directory.isNullOrEmpty(), "Run through contract/scripts/run.cjs with generated contract artifacts")
    return File(directory!!)
  }

  @Test fun sharedSeedBounds() = runBlocking {
    val root = contractRoot()
    val expected = Json.parseToJsonElement(File(root, "expected.json").readText()).jsonObject
    val original = Json.parseToJsonElement(File(root, "contract-group.json").readText()).jsonObject
    val client = Client("https://contract", "dev", "member")
    client.syncManifest { File(root, "manifest.json").readText() }
    for (raw in expected["seedCases"]!!.jsonArray) {
      val sample = raw.jsonObject
      val environments = original["environments"]!!.jsonObject
      val environment = environments["dev"]!!.jsonObject
      val features = environment["features"]!!.jsonObject
      val feature = JsonObject(features["gradual"]!!.jsonObject + ("seed" to sample["value"]!!))
      val group = JsonObject(original + ("environments" to JsonObject(environments + ("dev" to JsonObject(environment + ("features" to JsonObject(features + ("gradual" to feature))))))))
      val accepted = runCatching { client.getFlags("contract-group") { group.toString() } }.isSuccess
      assertEquals(sample["valid"]!!.jsonPrimitive.boolean, accepted, "seed ${sample["value"]}")
    }
  }

  @Test fun sharedContract() = runBlocking {
    val root=contractRoot()
    val expected=Json.parseToJsonElement(File(root,"expected.json").readText()).jsonObject
    val fetch: suspend (String) -> String = { url -> File(root,URI(url).path.substringAfterLast('/')).readText() }
    for (raw in expected["environments"]!!.jsonArray) {
      val env=raw.jsonObject
      for(names in listOf(false,true)) {
        val client=Client("https://contract",env[if (names) { "name" } else { "id" }]!!.jsonPrimitive.content,"member")
        client.syncManifest(fetch)
        val group=expected[if (names) { "groupName" } else { "groupId" }]!!.jsonPrimitive.content
        val decoded=client.getFlags(group,fetch)
        val gradual=decoded.environments[env["id"]!!.jsonPrimitive.content]!!.features["gradual"] as GradualFeature
        assertEquals(env["seed"]!!.jsonPrimitive.double,gradual.seed)
        assertEquals(env["threshold"]!!.jsonPrimitive.double,gradual.value)
        for(fid in expected["scheduled"]!!.jsonArray.map { it.jsonPrimitive.content } + "scheduled-active") {
          val f=decoded.environments[env["id"]!!.jsonPrimitive.content]!!.features[fid]!!
          assertEquals(fid=="scheduled-active",Scheduler.isScheduleActiveWithNow(f.schedule,f.scheduleType,Instant.fromEpochMilliseconds(expected["referenceClock"]!!.jsonPrimitive.long)))
        }
        client.setFlags(decoded)
        for(rawCase in expected["cases"]!!.jsonArray) {
          val c=rawCase.jsonObject
          val fid=c[if (names) { "name" } else { "id" }]!!.jsonPrimitive.content
          val key=c["expectedKey"]!!.jsonPrimitive.content
          if(c["kind"]!!.jsonPrimitive.content=="value") {
            when(key) {
              "string" -> assertEquals(env[key]!!.jsonPrimitive.content,client.valueString(group,fid,"fallback").getOrThrow())
              "int" -> assertEquals(env[key]!!.jsonPrimitive.long,client.valueLong(group,fid,-1).getOrThrow())
              else -> assertEquals(env[key]!!.jsonPrimitive.double,client.valueDouble(group,fid,-1.0).getOrThrow())
            }
          } else {
            val n=c["instance"]!!.jsonPrimitive
            val got = if (n.isString) {
              client.should(group, fid, n.content)
            } else if (c["id"]!!.jsonPrimitive.content == "selective-int") {
              client.shouldCustomLong(group, fid, n.long)
            } else {
              client.shouldCustomDouble(group, fid, n.double)
            }
            assertEquals(env[key]!!.jsonPrimitive.boolean,got.getOrThrow(),fid)
          }
        }
        for(fid in expected["scheduled"]!!.jsonArray) {
          assertFalse(client.should(group,fid.jsonPrimitive.content).getOrThrow())
        }
      }
    }
  }
}
