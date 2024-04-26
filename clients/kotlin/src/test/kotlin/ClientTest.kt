import org.junit.jupiter.api.Test
import kotlin.test.*
import dev.vexilla.Client
import dev.vexilla.GradualGroup
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlinx.coroutines.runBlocking
import java.nio.charset.Charset

class ClientTest {
    @Test
    fun `should handle testing against the test-server repo`() {

        val httpClient = HttpClient(CIO)

        val testServerHost: String = System.getenv("TEST_SERVER_HOST") ?: "http://localhost:3000"

        val uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
        val vexillaClient = Client(testServerHost, "dev", uuid)

        runBlocking {
            vexillaClient.syncManifest { url ->
                httpClient.get(url).bodyAsText(Charset.defaultCharset())
            }

            vexillaClient.syncFlags(GradualGroup.name) { url ->
                httpClient.get(url).bodyAsText(Charset.defaultCharset())
            }

            vexillaClient.syncFlags("Selective") { url ->
                httpClient.get(url).bodyAsText(Charset.defaultCharset())
            }

            vexillaClient.syncFlags("Value") { url ->
                httpClient.get(url).bodyAsText(Charset.defaultCharset())
            }

            vexillaClient.syncFlags("Scheduled") { url ->
                httpClient.get(url).bodyAsText(Charset.defaultCharset())
            }
        }

        val shouldGradual = vexillaClient.should("Gradual", "testingWorkingGradual")
        assertTrue(shouldGradual.isSuccess)
        assertEquals(true, shouldGradual.getOrNull())

        val shouldNotGradual = vexillaClient.should("Gradual", "testingNonWorkingGradual")
        assertTrue(shouldNotGradual.isSuccess)
        assertEquals(false, shouldNotGradual.getOrNull())

        val shouldSelective = vexillaClient.should("Selective", "String")
        assertTrue(shouldSelective.isSuccess)
        assertEquals(true, shouldSelective.getOrNull())

        val shouldSelectiveCustomString = vexillaClient.should("Selective", "String", "shouldBeInList")
        assertTrue(shouldSelectiveCustomString.isSuccess)
        assertEquals(true, shouldSelectiveCustomString.getOrNull())

        val shouldNotSelectiveCustomString = vexillaClient.should("Selective", "String", "shouldNOTBeInList")
        assertTrue(shouldNotSelectiveCustomString.isSuccess)
        assertEquals(false, shouldNotSelectiveCustomString.getOrNull())

        val shouldSelectiveCustomInt = vexillaClient.shouldCustomInt("Selective", "Number", 42)
        assertTrue(shouldSelectiveCustomInt.isSuccess)
        assertEquals(true, shouldSelectiveCustomInt.getOrNull())

        val shouldNotSelectiveCustomInt = vexillaClient.shouldCustomInt("Selective", "Number", 43)
        assertTrue(shouldNotSelectiveCustomInt.isSuccess)
        assertEquals(false, shouldNotSelectiveCustomInt.getOrNull())

        val valueString = vexillaClient.valueString("Value", "String", "")
        assertTrue(valueString.isSuccess)
        assertEquals("foo", valueString.getOrNull())

        val valueInt = vexillaClient.valueInt("Value", "Integer", 0)
        assertTrue(valueInt.isSuccess)
        assertEquals(42, valueInt.getOrNull())

        val valueFloat = vexillaClient.valueFloat("Value", "Float", 0.0f)
        assertTrue(valueFloat.isSuccess)
        assertEquals(42.42f, valueFloat.getOrNull())
        

        val beforeGlobal = vexillaClient.should("Scheduled", "beforeGlobal")
        assertTrue(beforeGlobal.isSuccess)
        assertEquals(false, beforeGlobal.getOrNull())

        val duringGlobal = vexillaClient.should("Scheduled", "duringGlobal")
        assertTrue(duringGlobal.isSuccess)
        assertEquals(true, duringGlobal.getOrNull())

        val afterGlobal = vexillaClient.should("Scheduled", "afterGlobal")
        assertTrue(afterGlobal.isSuccess)
        assertEquals(false, afterGlobal.getOrNull())


        val beforeGlobalStartEnd = vexillaClient.should("Scheduled", "beforeGlobalStartEnd")
        assertTrue(beforeGlobalStartEnd.isSuccess)
        assertEquals(false, beforeGlobalStartEnd.getOrNull())

        val duringGlobalStartEnd = vexillaClient.should("Scheduled", "duringGlobalStartEnd")
        assertTrue(duringGlobalStartEnd.isSuccess)
        assertEquals(true, duringGlobalStartEnd.getOrNull())

        val afterGlobalStartEnd = vexillaClient.should("Scheduled", "afterGlobalStartEnd")
        assertTrue(afterGlobalStartEnd.isSuccess)
        assertEquals(false, afterGlobalStartEnd.getOrNull())


        val beforeGlobalDaily = vexillaClient.should("Scheduled", "beforeGlobalDaily")
        assertTrue(beforeGlobalDaily.isSuccess)
        assertEquals(false, beforeGlobalDaily.getOrNull())

        val duringGlobalDaily = vexillaClient.should("Scheduled", "duringGlobalDaily")
        assertTrue(duringGlobalDaily.isSuccess)
        assertEquals(true, duringGlobalDaily.getOrNull())

        val afterGlobalDaily = vexillaClient.should("Scheduled", "afterGlobalDaily")
        assertTrue(afterGlobalDaily.isSuccess)
        assertEquals(false, afterGlobalDaily.getOrNull())
    }
}