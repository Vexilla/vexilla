import unittest
import os
import urllib.request

from vexilla_client.client import VexillaClient

from .enums import ValueGroup, GradualGroup, ScheduledGroup, SelectiveGroup

TEST_SERVER_HOST = os.environ.get("TEST_SERVER_HOST")
if not TEST_SERVER_HOST:
    TEST_SERVER_HOST = "localhost:3000"
UUID = "b7e91cc5-ec76-4ec3-9c1c-075032a13a1a"


class TestClient(unittest.TestCase):
    def test_client(self):
        """
        Test the client for working and non working gradual values
        """

        client = VexillaClient(f"http://{TEST_SERVER_HOST}", "dev", UUID)

        client.sync_manifest(lambda url: urllib.request.urlopen(url).read())

        client.sync_flags(
            GradualGroup.GROUP_ID, lambda url: urllib.request.urlopen(url).read()
        )

        self.assertTrue(
            client.should(
                GradualGroup.GROUP_ID,
                GradualGroup.TestingWorkingGradualFeature.FEATURE_ID,
            )
        )
        self.assertFalse(
            client.should(
                GradualGroup.GROUP_ID,
                GradualGroup.TestingNonWorkingGradualFeature.FEATURE_ID,
            )
        )


if __name__ == "__main__":
    unittest.main()
