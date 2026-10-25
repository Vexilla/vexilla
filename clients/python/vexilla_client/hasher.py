import math
from typing import Union


class InvalidInstanceIdError(ValueError):
    pass


def instance_text(value):
    if isinstance(value, str):
        if any(0xD800 <= ord(char) <= 0xDFFF for char in value):
            raise InvalidInstanceIdError(
                "Instance ID must contain Unicode scalar values"
            )
        return value
    if type(value) not in (int, float):
        raise InvalidInstanceIdError(
            "A finite numeric or string instance ID is required"
        )
    try:
        numeric = float(value)
    except (ValueError, OverflowError) as error:
        raise InvalidInstanceIdError("Instance ID is outside binary64") from error
    if not math.isfinite(numeric) or type(value) is int and numeric != value:
        raise InvalidInstanceIdError(
            "Instance ID must be exactly representable as finite binary64"
        )
    if numeric == 0:
        return "0"
    sign = "-" if numeric < 0 else ""
    text = repr(abs(numeric)).lower()
    mantissa, _, exponent = text.partition("e")
    digits = mantissa.replace(".", "").lstrip("0")
    point = (mantissa.find(".") if "." in mantissa else len(mantissa)) + int(
        exponent or "0"
    )
    if mantissa.startswith("0."):
        removed = len(mantissa.replace(".", "")) - len(digits)
        point -= removed
    digits = digits.rstrip("0")
    if 0 < point <= 21:
        if len(digits) <= point:
            return sign + digits + "0" * (point - len(digits))
        return sign + digits[:point] + "." + digits[point:]
    if -6 < point <= 0:
        return sign + "0." + "0" * -point + digits
    exponent = point - 1
    return (
        sign
        + digits[0]
        + ("." + digits[1:] if len(digits) > 1 else "")
        + "e"
        + ("+" if exponent >= 0 else "-")
        + str(abs(exponent))
    )


class Hasher:
    @staticmethod
    def hash_fnv32a(text: str) -> int:
        instance_text(text)
        result = 2166136261
        for byte in text.encode("utf-8"):
            result = ((result ^ byte) * 16777619) & 0xFFFFFFFF
        return result

    @staticmethod
    def hash_value(value_to_hash: Union[str, int, float], seed: float) -> float:
        return (
            Hasher.hash_fnv32a(instance_text(value_to_hash)) * float(seed) % 1000.0
        ) / 1000.0
