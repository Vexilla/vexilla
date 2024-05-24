import org.junit.jupiter.api.Test
import kotlin.test.*
import dev.vexilla.Hasher

//@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class HasherTest {

    private val uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";

    private val seedA = 0.32; // Working for string test
    private val seedB = 0.22; // Non-working for string test

    @Test
    fun `should hash a string and get a value under threshold for seed A`() {
        assertTrue(Hasher.hashString(this.uuid, this.seedA) <= 0.40)
    }

    @Test
    fun `should hash a string and get a value above threshold for seed B`() {
        assertTrue(Hasher.hashString(this.uuid, this.seedB) > 0.40)
    }

    @Test
    fun `should hash a int and get a value above threshold for seed B`() {
        assertTrue(Hasher.hashInt(42, this.seedB) > 0.40)
    }

    @Test
    fun `should hash a long and get a value above threshold for seed B`() {
        assertTrue(Hasher.hashLong(42, this.seedB) > 0.40)
    }

    @Test
    fun `should hash a float and get a value under threshold for seed B`() {
        assertTrue(Hasher.hashFloat(42.42.toFloat(), 0.11) <= 0.40)
    }

    @Test
    fun `should hash a double and get a value under threshold for a seed B`() {
        assertTrue(Hasher.hashDouble(42.42, 0.11) <= 0.40)
    }
}