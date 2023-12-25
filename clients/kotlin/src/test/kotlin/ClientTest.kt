import org.junit.jupiter.api.Test
import kotlin.test.*
import dev.vexilla.Client
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

        val uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
        val vexillaClient = Client("http://localhost:3000", "dev", uuid)

        runBlocking {
            vexillaClient.syncManifest { url ->
                httpClient.get(url).bodyAsText(Charset.defaultCharset())
            }

            vexillaClient.syncFlags("Gradual") { url ->
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
        assertTrue(shouldGradual)

        val shouldNotGradual = vexillaClient.should("Gradual", "testingNonWorkingGradual")
        assertFalse(shouldNotGradual)

        val shouldSelective = vexillaClient.should("Selective", "String")
        assertTrue(shouldSelective)

        val shouldSelectiveCustomString = vexillaClient.should("Selective", "String", "shouldBeInList")
        assertTrue(shouldSelectiveCustomString)

        val shouldNotSelectiveCustomString = vexillaClient.should("Selective", "String", "shouldNOTBeInList")
        assertFalse(shouldNotSelectiveCustomString)

        val shouldSelectiveCustomInt = vexillaClient.shouldCustomInt("Selective", "Number", 42)
        assertTrue(shouldSelectiveCustomInt)

        val shouldNotSelectiveCustomInt = vexillaClient.shouldCustomInt("Selective", "Number", 43)
        assertTrue(shouldNotSelectiveCustomInt)

        val valueString = vexillaClient.valueString("Value", "String", "")
        assertEquals("foo", valueString)

        val valueInt = vexillaClient.valueInt("Value", "Integer", 0)
        assertEquals(42, valueInt)

        val valueFloat = vexillaClient.valueFloat("Value", "Integer", 0.0f)
        assertEquals(0.42f, valueFloat)

        val beforeGlobal = vexillaClient.should("Scheduled", "beforeGlobal")
        assertFalse(beforeGlobal)

        val duringGlobal = vexillaClient.should("Scheduled", "duringGlobal")
        assertTrue(duringGlobal)

        val afterGlobal = vexillaClient.should("Scheduled", "afterGlobal")
        assertFalse(afterGlobal)


        val beforeGlobalStartEnd = vexillaClient.should("Scheduled", "beforeGlobalStartEnd")
        assertFalse(beforeGlobalStartEnd)

        val duringGlobalStartEnd = vexillaClient.should("Scheduled", "duringGlobalStartEnd")
        assertTrue(duringGlobalStartEnd)

        val afterGlobalStartEnd = vexillaClient.should("Scheduled", "afterGlobalStartEnd")
        assertFalse(afterGlobalStartEnd)


        val beforeGlobalDaily = vexillaClient.should("Scheduled", "beforeGlobalDaily")
        assertFalse(beforeGlobalDaily)

        val duringGlobalDaily = vexillaClient.should("Scheduled", "duringGlobalDaily")
        assertTrue(duringGlobalDaily)

        val afterGlobalDaily = vexillaClient.should("Scheduled", "afterGlobalDaily")
        assertFalse(afterGlobalDaily)
    }
}