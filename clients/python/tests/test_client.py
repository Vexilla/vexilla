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

        client.sync_flags(
            SelectiveGroup.GROUP_ID, lambda url: urllib.request.urlopen(url).read()
        )

        self.assertTrue(client.should(SelectiveGroup.GROUP_ID, SelectiveGroup.StringFeature.FEATURE_ID))

        self.assertTrue(client.should_custom(SelectiveGroup.GROUP_ID, SelectiveGroup.StringFeature.FEATURE_ID, "shouldBeInList"))

        self.assertFalse(client.should_custom(SelectiveGroup.GROUP_ID, SelectiveGroup.StringFeature.FEATURE_ID, "NOT_IN_LIST"))

        self.assertTrue(client.should_custom(SelectiveGroup.GROUP_ID, SelectiveGroup.NumberFeature.FEATURE_ID, 42))


        client.sync_flags(
            ValueGroup.GROUP_ID, lambda url: urllib.request.urlopen(url).read()
        )

        self.assertEquals("foo", client.value(ValueGroup.GROUP_ID, ValueGroup.StringFeature.FEATURE_ID, ""))

        self.assertEquals(42, client.value(ValueGroup.GROUP_ID, ValueGroup.IntegerFeature.FEATURE_ID, 0))

        self.assertEquals(42.42, client.value(ValueGroup.GROUP_ID, ValueGroup.FloatFeature.FEATURE_ID, 0.0))


        client.sync_flags(
            ScheduledGroup.GROUP_ID, lambda url: urllib.request.urlopen(url).read()
        )

        self.assertFalse(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.BeforeGlobalFeature.FEATURE_ID))
        self.assertTrue(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.DuringGlobalFeature.FEATURE_ID))
        self.assertFalse(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.AfterGlobalFeature.FEATURE_ID))

        self.assertFalse(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.BeforeGlobalStartEndFeature.FEATURE_ID))
        self.assertTrue(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.DuringGlobalStartEndFeature.FEATURE_ID))
        self.assertFalse(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.AfterGlobalStartEndFeature.FEATURE_ID))

        self.assertFalse(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.BeforeGlobalDailyFeature.FEATURE_ID))
        self.assertTrue(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.DuringGlobalDailyFeature.FEATURE_ID))
        self.assertFalse(client.should(ScheduledGroup.GROUP_ID, ScheduledGroup.AfterGlobalDailyFeature.FEATURE_ID))


if __name__ == "__main__":
    unittest.main()
