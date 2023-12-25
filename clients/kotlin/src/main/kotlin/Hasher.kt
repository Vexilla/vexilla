package dev.vexilla

import kotlin.math.floor

object Hasher {
    fun hashString(stringToHash: String, seed: Double): Double {
        var hashValue = 0

        val length = stringToHash.length - 1
        for (i in 0..length) {
            hashValue += stringToHash[i].hashCode()
        }

        val hashedValue = floor(hashValue * seed * 42) % 100 / 100

        return hashedValue
    }

    fun hashInt(numberToHash: Int, seed: Double): Double {
        return Hasher.hashString("$numberToHash", seed)
    }

    fun hashLong(numberToHash: Long, seed: Double): Double {
        return Hasher.hashString("$numberToHash", seed)
    }

    fun hashFloat(numberToHash: Float, seed: Double): Double {
        return Hasher.hashString("$numberToHash", seed)
    }

    fun hashDouble(numberToHash: Double, seed: Double): Double {
        return Hasher.hashString("$numberToHash", seed)
    }

}
