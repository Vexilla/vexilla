package dev.vexilla

import kotlinx.serialization.json.*

class ContractException(val kind: String, message: String) : IllegalArgumentException(message)

object Compatibility {
    private val data =
        Compatibility::class
            .java
            .getResourceAsStream("/compatibility.json")
            ?.bufferedReader(Charsets.UTF_8)
            ?.use { Json.parseToJsonElement(it.readText()).jsonObject }
            ?: error("Missing pinned publisher compatibility resource")
    private val unicode = data.getValue("unicode").jsonObject
    private val lower = unicode.getValue("lower").jsonObject
    private val cased =
        unicode.getValue("casedRanges").jsonArray.map {
            it.jsonArray.map { n -> n.jsonPrimitive.int }
        }
    private val ignorable =
        unicode.getValue("ignorableRanges").jsonArray.map {
            it.jsonArray.map { n -> n.jsonPrimitive.int }
        }

    private fun asciiLower(text: String) =
        text
            .map {
                if (it in 'A'..'Z') {
                    (it.code + 32).toChar()
                } else {
                    it
                }
            }
            .joinToString("")

    private val zones =
        data
            .getValue("timezone")
            .jsonObject
            .getValue("identifiers")
            .jsonArray
            .map { asciiLower(it.jsonPrimitive.content) }
            .toSet()
    private val offset =
        Regex(data.getValue("timezone").jsonObject.getValue("offsetPattern").jsonPrimitive.content)

    fun isUnicode(text: String): Boolean {
        var index = 0
        while (index < text.length) {
            val ch = text[index++]
            if (Character.isHighSurrogate(ch)) {
                if (index == text.length || !Character.isLowSurrogate(text[index++])) {
                    return false
                }
            } else if (Character.isLowSurrogate(ch)) {
                return false
            }
        }
        return true
    }

    fun timezone(text: String): Boolean = asciiLower(text) in zones || offset.matches(text)

    private fun inside(code: Int, ranges: List<List<Int>>): Boolean {
        var first = 0
        var last = ranges.lastIndex
        while (first <= last) {
            val mid = (first + last) / 2
            if (code < ranges[mid][0]) {
                last = mid - 1
            } else if (code > ranges[mid][1]) {
                first = mid + 1
            } else {
                return true
            }
        }
        return false
    }

    private fun lower(text: String): String {
        val chars = text.codePoints().toArray()
        val result = StringBuilder()
        for ((index, code) in chars.withIndex()) {
            if (code == 0x03a3) {
                var before = index - 1
                var after = index + 1
                while (before >= 0 && inside(chars[before], ignorable)) {
                    before--
                }
                while (after < chars.size && inside(chars[after], ignorable)) {
                    after++
                }
                result.append(
                    if (
                        before >= 0 &&
                            inside(chars[before], cased) &&
                            (after == chars.size || !inside(chars[after], cased))
                    ) {
                        "ς"
                    } else {
                        "σ"
                    }
                )
            } else {
                result.append(
                    lower[String(Character.toChars(code))]?.jsonPrimitive?.content
                        ?: String(Character.toChars(code))
                )
            }
        }
        return result.toString()
    }

    private fun upper(code: Int) = code in 65..90 || code in 192..214 || code in 216..222

    private fun baseLower(code: Int) = code in 97..122 || code in 223..246 || code in 248..255

    private fun symbol(code: Int) =
        code in 32..38 ||
            code in 40..47 ||
            code in 58..64 ||
            code in 91..96 ||
            code in 123..126 ||
            code in 160..191 ||
            code == 215 ||
            code == 247

    fun normalize(input: String): String {
        if (!isUnicode(input)) {
            throw ContractException("validation", "Malformed Unicode name")
        }
        var text = input
        var chars = text.codePoints().toArray()
        val hasRoom = chars.any(::symbol)
        if (!chars.any(::baseLower)) {
            text = lower(text)
            chars = text.codePoints().toArray()
        }
        if (!hasRoom) {
            val out = StringBuilder()
            var i = 0
            while (i < chars.size) {
                var j = i + 1
                while (j < chars.size && upper(chars[j])) {
                    j++
                }
                out.appendCodePoint(chars[i])
                if (!upper(chars[i]) && j > i + 1) {
                    out.append(' ')
                    if (j > i + 2) {
                        for (k in i + 1 until j - 1) {
                            out.appendCodePoint(chars[k])
                        }
                        out.append(' ')
                    }
                    out.appendCodePoint(chars[j - 1])
                    i = j
                } else {
                    i++
                }
            }
            text = out.toString()
        }
        chars = lower(text).codePoints().toArray()
        val out = StringBuilder()
        var i = 0
        while (i < chars.size) {
            if (symbol(chars[i])) {
                while (i < chars.size && symbol(chars[i])) {
                    i++
                }
                if (i < chars.size) {
                    out.append('-').appendCodePoint(chars[i])
                    i++
                }
            } else {
                out.appendCodePoint(chars[i])
                i++
            }
        }
        return out.toString().replace("'", "")
    }
}
