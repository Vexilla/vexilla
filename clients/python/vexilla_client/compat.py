"""Publisher-compatible aliases and timezone identifiers, independent of host locale."""
import json
import re
from pathlib import Path

_DATA = json.loads(Path(__file__).with_name("compatibility.json").read_text())
_ASCII_LOWER = str.maketrans("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")
_TIMEZONES = {name.translate(_ASCII_LOWER) for name in _DATA["timezone"]["identifiers"]}
_LOWER = _DATA["unicode"]["lower"]
_UPPER = "A-ZÀ-ÖØ-Þ"
_BASE_LOWER = "a-zß-öø-ÿ"
_SYMBOLS = "\\x20-\\x26\\x28-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\x7e\\xa0-\\xbf×÷"
_ROOM = re.compile("[" + _SYMBOLS + "]")
_FILL = re.compile("[" + _SYMBOLS + "]+(.|$)", re.DOTALL)
_RELAX = re.compile("([^" + _UPPER + "])([" + _UPPER + "]*)([" + _UPPER + "])(?=[^" + _UPPER + "]|$)")

def _in_ranges(code, ranges):
    first, last = 0, len(ranges) - 1
    while first <= last:
        mid = (first + last) // 2
        if code < ranges[mid][0]:
            last = mid - 1
        elif code > ranges[mid][1]:
            first = mid + 1
        else:
            return True
    return False


def _lower(text):
    result = []
    for index, char in enumerate(text):
        if char == "Σ":
            before, after = index - 1, index + 1
            while before >= 0 and _in_ranges(ord(text[before]), _DATA["unicode"]["ignorableRanges"]):
                before -= 1
            while after < len(text) and _in_ranges(ord(text[after]), _DATA["unicode"]["ignorableRanges"]):
                after += 1
            final = before >= 0 and _in_ranges(ord(text[before]), _DATA["unicode"]["casedRanges"]) and (after == len(text) or not _in_ranges(ord(text[after]), _DATA["unicode"]["casedRanges"]))
            result.append("ς" if final else "σ")
        else:
            result.append(_LOWER.get(char, char))
    return "".join(result)


def normalize(text):
    if text and not re.search("[" + _BASE_LOWER + "]", text):
        text = _lower(text)
    if not _ROOM.search(text):
        text = _RELAX.sub(lambda m: m[1] + " " + (m[2] + " " if m[2] else "") + m[3], text)
    return _FILL.sub(lambda m: "-" + m[1] if m[1] else "", _lower(text)).replace("'", "")


def timezone(value):
    return isinstance(value, str) and (value.translate(_ASCII_LOWER) in _TIMEZONES or re.fullmatch(_DATA["timezone"]["offsetPattern"], value) is not None)
