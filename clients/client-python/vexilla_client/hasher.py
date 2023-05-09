import math


class Hasher:
  def __init__(self, seed):
    self.__seed = seed

  def hashString(self, string_to_hash):
    char_code_array = [ord(char) for char in string_to_hash]
    hash_value = sum(char_code_array)
    return math.floor(hash_value * self.__seed * 42) % 100
