import math
from typing import Union


class Hasher:
    @staticmethod
    def hash_value(value_to_hash: Union[str, int, float], seed: float) -> float:
        char_code_array = [ord(char) for char in f'{value_to_hash}']
        hash_value = sum(char_code_array)
        return math.floor(hash_value * seed * 42) % 100
