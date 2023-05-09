
import kotlin.test.*

class ClientTest {

    @Test
    fun `should test the client`() {
        val client = Client(
            "https://streamparrot-feature-flags.s3.amazonaws.com/",
            "dev",
            "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"
        ).getFlags()

        val shouldDevWorkingGradual = client.should("testingWorkingGradual")
        assertTrue(shouldDevWorkingGradual)

        val shouldDevNonWorkingGradual = client.should("testingNonWorkingGradual")
        assertFalse(shouldDevNonWorkingGradual)

    }

}