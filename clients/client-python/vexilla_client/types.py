import enum
from pydantic import BaseModel, Field, validator
from typing import List, Literal, Optional, Union, Dict
from typing_extensions import Annotated


class FeatureType(enum.Enum):
    TOGGLE = "toggle"
    GRADUAL = "gradual"
    SELECTIVE = "selective"
    VALUE = "value"


class ScheduleType(enum.Enum):
    EMPTY = ""
    GLOBAL = "global"
    ENVIRONMENT = "environment"


class ScheduleTimeType(enum.Enum):
    NONE = "none"
    START_END = "start/end"
    DAILY = "daily"


class ValueType(enum.Enum):
    STRING = "string"
    NUMBER = "number"


class NumberType(enum.Enum):
    INT = "int"
    FLOAT = "float"


class Schedule(BaseModel):
    start: int
    end: int
    timezone: str = "UTC"
    time_type: ScheduleTimeType = Field(..., alias="timeType")
    start_time: int = Field(..., alias="startTime")
    end_time: int = Field(..., alias="endTime")


class GroupMeta(BaseModel):
    version: str


class ManifestGroup(BaseModel):
    name: str
    group_id: str = Field(..., alias="groupId")


class Manifest(BaseModel):
    version: str
    groups: List[ManifestGroup]


class BaseFeature(BaseModel):
    name: str
    feature_id: str = Field(..., alias="featureId")
    feature_type: FeatureType = Field(..., alias="featureType")
    schedule_type: FeatureType = Field(..., alias="scheduleType")
    schedule: Schedule


class ToggleFeature(BaseFeature):
    feature_type: Literal[FeatureType.TOGGLE]
    value: bool


class GradualFeature(BaseFeature):
    feature_type: Literal[FeatureType.GRADUAL]
    value: float
    seed: float


class BaseValueFeature(BaseFeature):
    value_type: ValueType = Field(..., alias="valueType")
    number_type: NumberType = Field(..., alias="numberType")


class ValueStringFeature(BaseValueFeature):
    value_type: Literal[ValueType.STRING] = Field(..., alias="valueType")
    value: str


class ValueIntFeature(BaseValueFeature):
    value_type: Literal[ValueType.NUMBER] = Field(..., alias="valueType")
    number_type: Literal[NumberType.INT] = Field(..., alias="numberType")
    value: int


class ValueFloatFeature(BaseValueFeature):
    value_type: Literal[ValueType.NUMBER] = Field(..., alias="valueType")
    number_type: Literal[NumberType.FLOAT] = Field(..., alias="numberType")
    value: float


ValueNumberFeature = Annotated[
    Union[ValueIntFeature, ValueFloatFeature], Field(discriminator="number_type")
]

ValueFeature = Annotated[
    Union[ValueStringFeature, ValueNumberFeature], Field(discriminator="value_type")
]


class BaseSelectiveFeature(BaseModel):
    value_type: ValueType = Field(..., alias="valueType")
    number_type: NumberType = Field(..., alias="numberType")


class SelectiveStringFeature(BaseSelectiveFeature):
    value_type: Literal[ValueType.STRING] = Field(..., alias="valueType")
    value: List[str]


class SelectiveIntFeature(BaseSelectiveFeature):
    value_type: Literal[ValueType.NUMBER] = Field(..., alias="valueType")
    number_type: Literal[NumberType.INT] = Field(..., alias="numberType")
    value: List[int]


class SelectiveFloatFeature(BaseSelectiveFeature):
    value_type: Literal[ValueType.NUMBER] = Field(..., alias="valueType")
    number_type: Literal[NumberType.FLOAT] = Field(..., alias="numberType")
    value: List[float]


SelectiveNumberFeature = Annotated[
    Union[SelectiveIntFeature, SelectiveFloatFeature],
    Field(discriminator="number_type"),
]

SelectiveFeature = Annotated[
    Union[SelectiveStringFeature, SelectiveNumberFeature],
    Field(discriminator="value_type"),
]


Feature = Annotated[
    Union[ToggleFeature, GradualFeature, ValueFeature, SelectiveFeature],
    Field(discriminator="feature_type"),
]


class Environment(BaseModel):
    name: str
    environment_id: str = Field(..., alias="environmentId")
    features: Dict[str, Feature]


class Group(BaseModel):
    name: str
    group_id: str = Field(..., alias="groupId")
    meta: GroupMeta
    environments: Dict[str, Environment]
    features: Dict[str, Feature]
