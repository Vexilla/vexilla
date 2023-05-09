import kotlin.math.floor

class Hasher(private val seed: Double) {
    fun hashString(stringToHash: String): Double {
        var hashValue = 0

        val length = stringToHash.length - 1
        for(i in 0..length) {
            hashValue += stringToHash[i].hashCode()
        }

        val hashedValue = floor(hashValue * this.seed * 42) % 100
        println(hashedValue)

        return hashedValue
    }
}
