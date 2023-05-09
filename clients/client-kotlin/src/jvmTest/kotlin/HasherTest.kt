import org.junit.Test
import kotlin.test.*

//@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class HasherTest {

    private val uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a";

    private val nonWorkingSeed = 0.22;
    private val workingSeed = 0.11;

    @Test
    fun `should get a value under 40 for a working seed`() {
        assertTrue(Hasher(this.workingSeed).hashString(this.uuid) <= 40);
    }

    @Test
    fun `should get a value above 40 for a non working seed`() {
        assertTrue(Hasher(this.nonWorkingSeed).hashString(this.uuid) > 40)
    }
}