import dev.vexilla.*
import java.util.logging.Handler
import java.util.logging.Level
import java.util.logging.LogRecord
import java.util.logging.Logger
import kotlin.test.*
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test

class LoggingTest {
    @Test
    fun diagnosticsAreOptInAndPreserveFailures() = runBlocking {
        val diagnostics = mutableListOf<String>()
        val logger = Logger.getLogger(Client::class.java.name)
        val originalLevel = logger.level
        val originalUseParentHandlers = logger.useParentHandlers
        val handler =
            object : Handler() {
                override fun publish(record: LogRecord) {
                    diagnostics.add(record.message)
                }

                override fun flush() {}

                override fun close() {}
            }
        logger.addHandler(handler)
        logger.level = Level.ALL
        logger.useParentHandlers = false
        try {
            for (showLogs in listOf(false, true)) {
                diagnostics.clear()
                val client =
                    Client("https://private-token@contract", "prod", "private-instance", showLogs)
                val manifest = client.getManifest { "{\"version\":\"v1\",\"groups\":[]}" }
                client.setManifest(manifest)
                assertFailsWith<ContractException> {
                    client.getManifest { error("private-callback-error") }
                }
                assertFailsWith<ContractException> {
                    client.setManifest(Manifest("invalid", emptyList()))
                }
                if (showLogs) {
                    assertEquals(
                        listOf(
                            "vexilla operation=manifest.fetch outcome=success",
                            "vexilla operation=manifest.install outcome=success",
                            "vexilla operation=manifest.fetch outcome=failure",
                            "vexilla operation=manifest.install outcome=failure",
                        ),
                        diagnostics,
                    )
                    assertTrue(diagnostics.none { "private-" in it })
                } else {
                    assertTrue(diagnostics.isEmpty())
                }
            }
        } finally {
            logger.removeHandler(handler)
            logger.level = originalLevel
            logger.useParentHandlers = originalUseParentHandlers
        }
    }
}
