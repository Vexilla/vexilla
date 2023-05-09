import unittest

from vexilla_client import VexillaClient

class TestClient(unittest.TestCase):

  __uuid = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"

  def test_client(self):
    """
    Test the client for working and non working gradual values
    """

    client = VexillaClient(
      "https://streamparrot-feature-flags.s3.amazonaws.com",
      "dev",
      self.__uuid
    ).fetch_flags("features")

    self.assertTrue(client.should("testingWorkingGradual"))
    self.assertFalse(client.should("testingNonWorkingGradual"))

if __name__ == '__main__':
    unittest.main()