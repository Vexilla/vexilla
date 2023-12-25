import org.junit.jupiter.api.Test
import kotlin.test.*
import dev.vexilla.Hasher

//@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class HasherTest {

    private val uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";

    private val nonWorkingSeed = 0.22;
    private val workingSeed = 0.11;

    @Test
    fun `should hash a string get a value under threshold for a working seed`() {
        assertTrue(Hasher.hashString(this.uuid, this.workingSeed) <= 0.40)
    }

    @Test
    fun `should hash a string get a value above threshold for a non working seed`() {
        assertTrue(Hasher.hashString(this.uuid, this.nonWorkingSeed) > 0.40)
    }

    @Test
    fun `should hash a int get a value above threshold for a non working seed`() {
        assertTrue(Hasher.hashInt(42, this.nonWorkingSeed) > 0.40)
    }

    @Test
    fun `should hash a long get a value above threshold for a non working seed`() {
        assertTrue(Hasher.hashLong(42, this.nonWorkingSeed) > 0.40)
    }

    @Test
    fun `should hash a float get a value under threshold for a non working seed`() {
        assertTrue(Hasher.hashFloat(42.42.toFloat(), this.nonWorkingSeed) < 0.40)
    }

    @Test
    fun `should hash a double get a value under threshold for a non working seed`() {
        assertTrue(Hasher.hashDouble(42.42, this.nonWorkingSeed) < 0.40)
    }
}