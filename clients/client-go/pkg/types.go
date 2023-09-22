package internal

type GroupId string
type GroupName string
type EnvironmentId string
type EnvironmentName string
type FeatureId string
type FeatureName string

type FeatureType string
const (
	GradualFeatureType FeatureType = "gradual"
	SelectiveFeatureType FeatureType = "selective"
	ToggleFeatureType FeatureType = "toggle"
	ValueFeatureType FeatureType = "value"
)

type ScheduleType string
const (
	EmptyScheduleType ScheduleType = ""
	GlobalScheduleType ScheduleType = "global"
	EnvironmentScheduleType ScheduleType = "environment"
)

type ScheduleTimeType string
const (
	NoneScheduleTimeType ScheduleTimeType = "none"
	StartEndScheduleTimeType ScheduleTimeType = "start/end"
	DailyScheduleTimeType ScheduleTimeType = "daily"
)

type Schedule struct {
	Start int64 `json:"start"`
	End int64 `json:"end"`
	Timezone string `json:"timezone"`
	TimeType ScheduleTimeType `json:"timeType"` // TODO: default to UTC when needed
	StartTime int64 `json:"startTime"`
	EndTime int64 `json:"endTime"`
}

type Feature struct {
	Name FeatureName `json:"name"`
	FeatureId FeatureId `json:"featureId"`
	FeatureType FeatureType `json:"featureType"`
	ScheduleType ScheduleType `json:"scheduleType"`
	Schedule Schedule `json:"schedule"`
}

type GroupMeta struct {
	Version string `json:"version"`
}

type Environment struct {
	Name EnvironmentName `json:"name"`
	EnvironmentId EnvironmentId `json:"environmentId"`
	Features map[FeatureId]Feature `json:"features"`
}

type ManifestGroup struct {
	Name GroupName `json:"name"`
	GroupId GroupId `json:"groupId"`
}

type Manifest struct {
	Version string `json:"version"`
	Groups []ManifestGroup `json:"groups"`
}

type Group struct {
	Name GroupName `json:"name"`
	GroupId GroupId `json:"groupId"`
	Environments map[EnvironmentId]Environment `json:"environments"`
	Features map[FeatureId]Feature `json:"features"`
	Meta GroupMeta `json:"meta"`
}

type RealIds struct {
	RealGroupId GroupId
	RealFeatureId FeatureId
	RealEnvironmentId EnvironmentId
}

type ClientConfig struct {
	Environment string
	BaseURL string
	InstanceId string

	ShowLogs bool

	Manifest Manifest
	FlagGroups map[GroupId]Group

	GroupLookupTable map[string]GroupId
	EnvironmentLookupTable map[GroupId]map[string]EnvironmentId
	FeatureLookupTable map[GroupId]map[string]FeatureId
}

type ToggleFeature struct {
	Feature
	Value bool `json:"value"`
}

type GradualFeature struct {
	Feature
	Value int64 `json:"value"`
	Seed float64 `json:"seed"`
}

type ValueStringFeature struct {
	Feature
	Value string `json:"value"`
}

type ValueIntFeature struct {
	Feature
	Value int64 `json:"value"`
}

type ValueFloatFeature struct {
	Feature
	Value float64 `json:"value"`
}

type SelectiveStringFeature struct {
	Feature
	Value []string `json:"value"`
}

type SelectiveIntFeature struct {
	Feature
	Value []int64 `json:"value"`
}

type SelectiveFloatFeature struct {
	Feature
	Value []float64 `json:"value"`
}
