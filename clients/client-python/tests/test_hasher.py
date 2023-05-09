import unittest

from vexilla_client import Hasher

class TestHasher(unittest.TestCase):

  __non_working_gradual_seed = 0.22
  __working_gradual_seed = 0.11
  __uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

  def test_hash_string_with_working_gradual(self):
    """
    Test the hasher against a working gradual seed
    """
    hasher = Hasher(self.__working_gradual_seed)
    self.assertTrue(hasher.hashString(self.__uuid) <= 40)

  def test_hash_string_with_non_working_gradual(self):
    """
    Test the hasher against a non-working gradual seed
    """
    hasher = Hasher(self.__non_working_gradual_seed)
    self.assertTrue(hasher.hashString(self.__uuid) >= 40)


if __name__ == '__main__':
    unittest.main()