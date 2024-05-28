import math
from typing import Union


FNV32_OFFSET_BASIS = 2166136261;
FNV32_PRIME = 16777619;

class Hasher:
    @staticmethod
    def hash_value(value_to_hash: Union[str, int, float], seed: float) -> float:
        # char_code_array = [ord(char) ]

        hash_result = FNV32_OFFSET_BASIS
        for char in str(value_to_hash):
            hash_result ^= ord(char)
            hash_result = (hash_result * FNV32_PRIME) & 0xffffffff

        return hash_result * seed % 1000 / 1000

        # hash_value = sum(char_code_array)
        # return math.floor(hash_value * seed * 42) % 100 / 100
