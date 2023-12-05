import unittest

from vexilla_client.hasher import Hasher


class TestHasher(unittest.TestCase):
    __non_working_gradual_seed = 0.22
    __working_gradual_seed = 0.11
    __uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

    def test_hash_string_with_working_gradual(self):
        """
        Test the hasher against a working gradual seed
        """
        hash_result = Hasher.hash_value(self.__uuid, self.__working_gradual_seed)
        self.assertTrue(hash_result <= 0.40)

    def test_hash_string_with_non_working_gradual(self):
        """
        Test the hasher against a non-working gradual seed
        """
        hash_result = Hasher.hash_value(self.__uuid, self.__non_working_gradual_seed)
        self.assertTrue(hash_result > 0.40)


if __name__ == "__main__":
    unittest.main()
