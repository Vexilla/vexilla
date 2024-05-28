package dev.vexilla

import kotlin.math.floor

object Hasher {

    // private var manifest: Manifest? = null
    // private const uint FNV32_OFFSET_BASIS = 2166136261;
    // private const uint FNV32_PRIME = 16777619;

    private var FNV32_OFFSET_BASIS: UInt = 2166136261u
    private var FNV32_PRIME: UInt = 16777619u

    fun hashString(stringToHash: String, seed: Double): Double {
        var hashValue = FNV32_OFFSET_BASIS

        val length = stringToHash.length - 1
        for (i in 0..length) {
            val char = stringToHash[i]
            hashValue = hashValue xor char.code.toUInt()
            hashValue *= FNV32_PRIME
        }

        return floor(hashValue.toDouble() * seed * 42) % 1000 / 1000
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
