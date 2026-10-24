package dev.vexilla

import java.math.BigDecimal
import java.math.BigInteger
import java.math.MathContext
import java.math.RoundingMode
import kotlin.math.abs

object Hasher {
    fun validateInstance(value: Any?) {
        when (value) {
            is String ->
                if (!Compatibility.isUnicode(value)) {
                    throw ContractException("instance", "Malformed Unicode instance ID")
                }
            is Byte,
            is Short,
            is Int,
            is Long -> {
                val integer = (value as Number).toLong()
                if (
                    BigDecimal(integer.toDouble()).toBigIntegerExact() !=
                        BigInteger.valueOf(integer)
                ) {
                    throw ContractException("instance", "Integer ID is not exactly binary64")
                }
            }
            is Double,
            is Float ->
                if (!(value as Number).toDouble().isFinite()) {
                    throw ContractException("instance", "Finite instance ID required")
                }
            else ->
                throw ContractException(
                    "instance",
                    "A finite numeric or string instance ID is required",
                )
        }
    }

    fun instanceText(value: Any?): String {
        validateInstance(value)
        if (value is String) {
            return value
        }
        val number = (value as Number).toDouble()
        if (number == 0.0) {
            return "0"
        }
        val exact = BigDecimal(abs(number))
        val exponent = exact.precision() - exact.scale() - 1
        var chosen: BigDecimal? = null
        // RFC 8785 / ECMAScript: choose the fewest significant decimal digits
        // that round back to the same binary64, then the closest (ties even).
        // Check neighbours too because binary64 intervals can be asymmetric.
        for (precision in 1..17) {
            val step = BigDecimal.ONE.scaleByPowerOfTen(exponent - precision + 1)
            val center = exact.round(MathContext(precision, RoundingMode.HALF_EVEN))
            val candidates =
                listOf(center, center - step, center + step)
                    .map { it.stripTrailingZeros() }
                    .filter {
                        it.signum() > 0 &&
                            it.precision() <= precision &&
                            it.toDouble() == abs(number)
                    }
            chosen =
                candidates.minWithOrNull(
                    compareBy<BigDecimal> { (it - exact).abs() }
                        .thenBy {
                            if (it.unscaledValue().testBit(0)) {
                                1
                            } else {
                                0
                            }
                        }
                )
            if (chosen != null) {
                break
            }
        }
        val decimal = chosen ?: error("No round-trip binary64 representation")
        val digits = decimal.unscaledValue().abs().toString()
        val point = digits.length - decimal.scale()
        val sign =
            if (number < 0) {
                "-"
            } else {
                ""
            }
        if (point in 1..21) {
            return sign +
                if (digits.length <= point) {
                    digits + "0".repeat(point - digits.length)
                } else {
                    digits.substring(0, point) + "." + digits.substring(point)
                }
        }
        if (point in -5..0) {
            return sign + "0." + "0".repeat(-point) + digits
        }
        val power = point - 1
        return sign +
            digits[0] +
            (if (digits.length > 1) {
                "." + digits.substring(1)
            } else {
                ""
            }) +
            "e" +
            (if (power >= 0) {
                "+"
            } else {
                "-"
            }) +
            abs(power).toString()
    }

    fun hashFnv32a(text: String): UInt {
        if (!Compatibility.isUnicode(text)) {
            throw ContractException("instance", "Malformed Unicode instance ID")
        }
        var value = 2166136261u
        for (byte in text.toByteArray(Charsets.UTF_8)) {
            value = (value xor (byte.toUInt() and 255u)) * 16777619u
        }
        return value
    }

    fun hashString(stringToHash: String, seed: Double): Double =
        (hashFnv32a(stringToHash).toDouble() * seed % 1000.0) / 1000.0

    fun hashInt(numberToHash: Int, seed: Double): Double =
        hashString(instanceText(numberToHash), seed)

    fun hashLong(numberToHash: Long, seed: Double): Double =
        hashString(instanceText(numberToHash), seed)

    fun hashFloat(numberToHash: Float, seed: Double): Double =
        hashString(instanceText(numberToHash), seed)

    fun hashDouble(numberToHash: Double, seed: Double): Double =
        hashString(instanceText(numberToHash), seed)
}
