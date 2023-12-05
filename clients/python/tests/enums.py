"""
  This file has been generated from your remote Vexilla Feature Flags file.

  You should NOT modify this file directly.

  It is encouraged to gitignore this file and generate it on-the-fly during build/compilation.
"""

from enum import Enum


class GradualGroup(str, Enum):
    NAME = "Gradual"
    GROUP_ID = "aKS-wxK2mMbeYxVVFSV8p"

    @staticmethod
    class DevEnvironment(str, Enum):
        NAME = "dev"
        ENVIRONMENT_ID = "zq-d4W97nyNo3mELbO_LT"

    @staticmethod
    class TestingWorkingGradualFeature(str, Enum):
        NAME = "testingWorkingGradual"
        FEATURE_ID = "oIVHzosp0ao3HN0fmFwwr"

    @staticmethod
    class TestingNonWorkingGradualFeature(str, Enum):
        NAME = "testingNonWorkingGradual"
        FEATURE_ID = "-T2se1u9jyj1HNkbJ9Cdr"


class ScheduledGroup(str, Enum):
    NAME = "Scheduled"
    GROUP_ID = "Jz0rgEv0epyCb6z58or72"

    @staticmethod
    class DevEnvironment(str, Enum):
        NAME = "dev"
        ENVIRONMENT_ID = "HRHIqkJIGYuPbZpvF74mi"

    @staticmethod
    class BeforeGlobalFeature(str, Enum):
        NAME = "beforeGlobal"
        FEATURE_ID = "7tmnvFX7RI3kOt5r57vyz"

    @staticmethod
    class DuringGlobalFeature(str, Enum):
        NAME = "duringGlobal"
        FEATURE_ID = "khEhXchcRuhNdDa8Il8VO"

    @staticmethod
    class AfterGlobalFeature(str, Enum):
        NAME = "afterGlobal"
        FEATURE_ID = "dPjTTjugWI5gJfcmoDmbU"

    @staticmethod
    class BeforeGlobalStartEndFeature(str, Enum):
        NAME = "beforeGlobalStartEnd"
        FEATURE_ID = "6iaSljA2uE74IPq4gNzEv"

    @staticmethod
    class DuringGlobalStartEndFeature(str, Enum):
        NAME = "duringGlobalStartEnd"
        FEATURE_ID = "0cq1IesUoQ7co34ViqHY8"

    @staticmethod
    class AfterGlobalStartEndFeature(str, Enum):
        NAME = "afterGlobalStartEnd"
        FEATURE_ID = "PKjpuHwBkjmofQlj-o3q5"

    @staticmethod
    class BeforeGlobalDailyFeature(str, Enum):
        NAME = "beforeGlobalDaily"
        FEATURE_ID = "hErE-2S6DeJBybg-zjo-h"

    @staticmethod
    class DuringGlobalDailyFeature(str, Enum):
        NAME = "duringGlobalDaily"
        FEATURE_ID = "VOg2MtzQbaAvZJLSyYXo_"

    @staticmethod
    class AfterGlobalDailyFeature(str, Enum):
        NAME = "afterGlobalDaily"
        FEATURE_ID = "dA_c61EnCwPL0ENcAbzJF"


class SelectiveGroup(str, Enum):
    NAME = "Selective"
    GROUP_ID = "SqR8BqpM6qgKxVtohkZE1"

    @staticmethod
    class DevEnvironment(str, Enum):
        NAME = "dev"
        ENVIRONMENT_ID = "mEghvHGNfmfHwoPT82We-"

    @staticmethod
    class StringFeature(str, Enum):
        NAME = "String"
        FEATURE_ID = "JWXHmkf_Sct1Jr2lqACRT"

    @staticmethod
    class NumberFeature(str, Enum):
        NAME = "Number"
        FEATURE_ID = "dlvHPXpmQ94KIzt3V-y4D"


class ValueGroup(str, Enum):
    NAME = "Value"
    GROUP_ID = "N-MDzoxJanbPOPg223Twf"

    @staticmethod
    class DevEnvironment(str, Enum):
        NAME = "dev"
        ENVIRONMENT_ID = "2CyvAAPow7cMHvlFFvuFj"

    @staticmethod
    class IntegerFeature(str, Enum):
        NAME = "Integer"
        FEATURE_ID = "Qp0lpyynA5H032t0z07Km"

    @staticmethod
    class FloatFeature(str, Enum):
        NAME = "Float"
        FEATURE_ID = "zRMmnUwKylOtX0tiQnxys"

    @staticmethod
    class StringFeature(str, Enum):
        NAME = "String"
        FEATURE_ID = "wkXA-cD1FHbf16yIHnPVi"
