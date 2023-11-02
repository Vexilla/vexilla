package internal

import "encoding/json"

type GroupId string
type GroupName string
type EnvironmentId string
type EnvironmentName string
type FeatureId string
type FeatureName string

type FeatureType string

const (
	GradualFeatureType   FeatureType = "gradual"
	SelectiveFeatureType FeatureType = "selective"
	ToggleFeatureType    FeatureType = "toggle"
	ValueFeatureType     FeatureType = "value"
)

type ScheduleType string

const (
	EmptyScheduleType       ScheduleType = ""
	GlobalScheduleType      ScheduleType = "global"
	EnvironmentScheduleType ScheduleType = "environment"
)

type ScheduleTimeType string

const (
	NoneScheduleTimeType     ScheduleTimeType = "none"
	StartEndScheduleTimeType ScheduleTimeType = "start/end"
	DailyScheduleTimeType    ScheduleTimeType = "daily"
)

type Schedule struct {
	Start     int64            `json:"start"`
	End       int64            `json:"end"`
	Timezone  string           `json:"timezone"`
	TimeType  ScheduleTimeType `json:"timeType"` // TODO: default to UTC when needed
	StartTime int64            `json:"startTime"`
	EndTime   int64            `json:"endTime"`
}

type GroupMeta struct {
	Version string `json:"version"`
}

type BaseEnvironment struct {
	Name          EnvironmentName               `json:"name"`
	EnvironmentId EnvironmentId                 `json:"environmentId"`
	RawFeatures   map[FeatureId]json.RawMessage `json:"features"`
}

type Environment struct {
	BaseEnvironment

	ToggleFeatures  map[FeatureId]ToggleFeature  `json:"-"`
	GradualFeatures map[FeatureId]GradualFeature `json:"-"`

	SelectiveFeatures       map[FeatureId]SelectiveFeature       `json:"-"`
	SelectiveStringFeatures map[FeatureId]SelectiveStringFeature `json:"-"`
	SelectiveIntFeatures    map[FeatureId]SelectiveIntFeature    `json:"-"`
	SelectiveFloatFeatures  map[FeatureId]SelectiveFloatFeature  `json:"-"`

	ValueFeatures       map[FeatureId]ValueFeature       `json:"-"`
	ValueStringFeatures map[FeatureId]ValueStringFeature `json:"-"`
	ValueIntFeatures    map[FeatureId]ValueIntFeature    `json:"-"`
	ValueFloatFeatures  map[FeatureId]ValueFloatFeature  `json:"-"`
}

type ManifestGroup struct {
	Name    GroupName `json:"name"`
	GroupId GroupId   `json:"groupId"`
}

type Manifest struct {
	Version string          `json:"version"`
	Groups  []ManifestGroup `json:"groups"`
}

type Group struct {
	Name    GroupName `json:"name"`
	GroupId GroupId   `json:"groupId"`
	Meta    GroupMeta `json:"meta"`

	Environments map[EnvironmentId]Environment `json:"environments"`
	Features     map[FeatureId]Feature         `json:"features"`
}

type RealIds struct {
	RealGroupId       GroupId
	RealFeatureId     FeatureId
	RealEnvironmentId EnvironmentId
}

type Feature struct {
	Name         FeatureName  `json:"name"`
	FeatureId    FeatureId    `json:"featureId"`
	FeatureType  FeatureType  `json:"featureType"`
	ScheduleType ScheduleType `json:"scheduleType"`
	Schedule     Schedule     `json:"schedule"`
}

type ToggleFeature struct {
	Feature
	Value bool `json:"value"`
}

type GradualFeature struct {
	Feature
	Value float64 `json:"value"`
	Seed  float64 `json:"seed"`
}

type ValueType string

const (
	StringValueType ValueType = "string"
	NumberValueType    ValueType = "number"
)

type NumberType string

const (
	IntNumberType NumberType = "int"
	FloatNumberType    NumberType = "float"
)

type ValueFeature struct {
	Feature
	ValueType ValueType `json:"valueType"`
	NumberType NumberType `json:"numberType"`
}

type ValueStringFeature struct {
	ValueFeature
	Value string `json:"value"`
}

type ValueIntFeature struct {
	ValueFeature
	Value int64 `json:"value"`
}

type ValueFloatFeature struct {
	ValueFeature
	Value float64 `json:"value"`
}

type SelectiveFeature struct {
	Feature
	ValueType ValueType `json:"valueType"`
	NumberType NumberType `json:"numberType"`
}

type SelectiveStringFeature struct {
	SelectiveFeature
	Value []string `json:"value"`
}

type SelectiveIntFeature struct {
	SelectiveFeature
	Value []int64 `json:"value"`
}

type SelectiveFloatFeature struct {
	SelectiveFeature
	Value []float64 `json:"value"`
}
