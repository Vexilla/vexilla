package vexilla

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	. "github.com/vexilla/vexilla/clients/go/pkg/internal"
)

// Client is the core module of this SDK. Most interaction with Vexilla and your feature flags will be through this module.
type Client struct {
	Environment string
	BaseURL     string
	InstanceId  string

	ShowLogs bool

	Manifest   Manifest
	FlagGroups map[GroupId]Group

	groupLookupTable       map[string]GroupId
	environmentLookupTable map[GroupId]map[string]EnvironmentId
	featureLookupTable     map[GroupId]map[string]FeatureId
}

// Create a new client for consuming feature flags.
func NewClient(environment string, baseURL string, customInstanceHash string, showLogs bool) Client {
	return Client{
		Environment: environment,
		BaseURL:     baseURL,
		InstanceId:  customInstanceHash,

		FlagGroups: make(map[GroupId]Group),

		groupLookupTable:       make(map[string]GroupId),
		environmentLookupTable: make(map[GroupId]map[string]EnvironmentId),
		featureLookupTable:     make(map[GroupId]map[string]FeatureId),
	}
}

// Fetches the manifest file for facilitating name->id lookups. Does not set the value on the client. You would need to call `SetManifest` after. Alternatively, you can use `SyncManifest` to do both steps with less code.
func (client Client) GetManifest(fetch func(url string) (*http.Response, error)) (Manifest, error) {
	url := fmt.Sprintf("%s/manifest.json", client.BaseURL)
	response, fetchErr := fetch(url)
	if fetchErr != nil {
		return Manifest{}, fetchErr
	}

	bodyBytes, err := io.ReadAll(response.Body)

	if err != nil {
		return Manifest{}, err
	}

	var fetchedManifest Manifest
	unmarshallErr := json.Unmarshal(bodyBytes, &fetchedManifest)

	if unmarshallErr != nil {
		return Manifest{}, unmarshallErr
	}

	return fetchedManifest, nil
}

// Sets a fetched manifest within the Client instance. It can also be useful for mocking flags for testing.
func (client *Client) SetManifest(manifest Manifest) {
	client.Manifest = manifest

	if client.groupLookupTable == nil {
		client.groupLookupTable = make(map[string]GroupId)
	}

	for _, group := range manifest.Groups {
		client.groupLookupTable[string(group.Name)] = group.GroupId
		client.groupLookupTable[string(group.GroupId)] = group.GroupId
	}

}

// Fetches and sets the manifest within the client to facilitate name->Id lookups.
func (client *Client) SyncManifest(fetch func(url string) (*http.Response, error)) error {
	newManifest, err := client.GetManifest(fetch)

	if err != nil {
		return err
	}

	client.SetManifest(newManifest)

	return nil
}

// Fetches the flags for a specific flag group. Can use the ID or the name of the group for the lookup.
func (client *Client) GetFlags(groupNameOrId string, fetch func(url string) (*http.Response, error)) (Group, error) {

	groupId := client.groupLookupTable[groupNameOrId]

	if groupId == "" {
		return Group{}, fmt.Errorf("group not found by Name or ID: %s", groupNameOrId)
	}

	url := fmt.Sprintf("%s/%s.json", client.BaseURL, groupId)
	response, fetchErr := fetch(url)
	if fetchErr != nil {
		return Group{}, fetchErr
	}

	bodyBytes, err := io.ReadAll(response.Body)

	if err != nil {
		return Group{}, err
	}

	var fetchedGroup Group
	unmarshallErr := json.Unmarshal(bodyBytes, &fetchedGroup)

	if unmarshallErr != nil {
		return Group{}, unmarshallErr
	}

	return fetchedGroup, nil
}

// Sets a fetched flag group within the Client instance.
func (client *Client) SetFlags(groupNameOrId string, group Group) error {
	groupId := client.groupLookupTable[groupNameOrId]

	if groupId == "" {
		return fmt.Errorf("no group found for: %s", groupNameOrId)
	}

	client.FlagGroups[groupId] = group

	if client.environmentLookupTable == nil {
		client.environmentLookupTable = make(map[GroupId]map[string]EnvironmentId)
	}

	if client.environmentLookupTable[group.GroupId] == nil {
		client.environmentLookupTable[group.GroupId] = make(map[string]EnvironmentId)
	}

	for _, environment := range group.Environments {
		client.environmentLookupTable[group.GroupId][string(environment.Name)] = environment.EnvironmentId
		client.environmentLookupTable[group.GroupId][string(environment.EnvironmentId)] = environment.EnvironmentId
	}

	if client.featureLookupTable == nil {
		client.featureLookupTable = make(map[GroupId]map[string]FeatureId)
	}

	if client.featureLookupTable[group.GroupId] == nil {
		client.featureLookupTable[group.GroupId] = make(map[string]FeatureId)
	}

	for _, feature := range group.Features {
		client.featureLookupTable[group.GroupId][string(feature.Name)] = feature.FeatureId
		client.featureLookupTable[group.GroupId][string(feature.FeatureId)] = feature.FeatureId
	}

	return nil
}

// Fetches and sets the flag group within the client to facilitate name->Id lookups.
func (client *Client) SyncFlags(groupNameOrId string, fetch func(url string) (*http.Response, error)) error {

	fetchedFlags, err := client.GetFlags(groupNameOrId, fetch)

	if err != nil {
		return err
	}

	return client.SetFlags(groupNameOrId, fetchedFlags)

}

// Checks if a toggle, gradual, or selective flag should be enabled. Other methods exist for other flag types, such as value.
func (client Client) Should(groupNameOrId string, featureNameOrId string) (bool, error) {
	return client.ShouldCustomString(groupNameOrId, featureNameOrId, client.InstanceId)
}

// Checks if a toggle, gradual, or selective flag should be enabled. Uses a custom instance ID rather than the one set in the Client. Other methods exist for other flag types, such as value.
func (client Client) ShouldCustomString(groupNameOrId string, featureNameOrId string, customInstanceId string) (bool, error) {

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	environment := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId]

	if environment.EnvironmentId == "" {
		return false, fmt.Errorf("no environment found for environmentId: %s", realIds.RealEnvironmentId)
	}

	switch rawFeature.FeatureType {
	case ToggleFeatureType:
		toggleFeature := environment.ToggleFeatures[realIds.RealFeatureId]

		if !IsScheduleActive(toggleFeature.Schedule, toggleFeature.ScheduleType) {
			return false, nil
		}

		return toggleFeature.Value, nil
	case GradualFeatureType:
		gradualFeature := environment.GradualFeatures[realIds.RealFeatureId]

		if !IsScheduleActive(gradualFeature.Schedule, gradualFeature.ScheduleType) {
			return false, nil
		}

		return HashStringInstanceID(customInstanceId, gradualFeature.Seed) < gradualFeature.Value, nil

	case SelectiveFeatureType:

		selectiveFeature := environment.SelectiveFeatures[realIds.RealFeatureId]

		if !IsScheduleActive(selectiveFeature.Schedule, selectiveFeature.ScheduleType) {
			return false, nil
		}

		switch selectiveFeature.ValueType {
		case StringValueType:
			selectiveStringFeature := environment.SelectiveStringFeatures[realIds.RealFeatureId]

			for i := range selectiveStringFeature.Value {
				if selectiveStringFeature.Value[i] == customInstanceId {
					return true, nil
				}
			}
		case NumberValueType:
			switch selectiveFeature.NumberType {
			case IntNumberType:
				return false, fmt.Errorf("selective feature, %s:%s, is not a StringValueType. Consider using ShouldCustomInt", selectiveFeature.Name, selectiveFeature.FeatureId)

			case FloatNumberType:
				return false, fmt.Errorf("selectivefeature, %s:%s, is not a StringValueType. Consider using ShouldCustomFloat", selectiveFeature.Name, selectiveFeature.FeatureId)
			}
		}

	case ValueFeatureType:
		return false, fmt.Errorf("selectivefeature, %s:%s, is not a StringValueType. Consider using ValueString, ValueInt, or ValueFloat", rawFeature.Name, rawFeature.FeatureId)

	}

	return false, nil
}

// Checks if a toggle, gradual, or selective flag should be enabled. Uses a custom instance ID as an int64 rather than the string set in the Client. Other methods exist for other flag types, such as value.
func (client Client) ShouldCustomInt(groupNameOrId string, featureNameOrId string, customInstanceId int64) (bool, error) {

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	environment := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId]

	if environment.EnvironmentId == "" {
		return false, fmt.Errorf("no environment found for environmentId: %s", realIds.RealEnvironmentId)
	}

	switch rawFeature.FeatureType {
	case ToggleFeatureType:
		toggleFeature := environment.ToggleFeatures[realIds.RealFeatureId]

		if !IsScheduleActive(toggleFeature.Schedule, toggleFeature.ScheduleType) {
			return false, nil
		}

		return toggleFeature.Value, nil
	case GradualFeatureType:
		gradualFeature := environment.GradualFeatures[realIds.RealFeatureId]
		if !IsScheduleActive(gradualFeature.Schedule, gradualFeature.ScheduleType) {
			return false, nil
		}
		return HashIntInstanceID(customInstanceId, gradualFeature.Seed) < gradualFeature.Value, nil

	case SelectiveFeatureType:
		selectiveFeature := environment.SelectiveFeatures[realIds.RealFeatureId]

		if !IsScheduleActive(selectiveFeature.Schedule, selectiveFeature.ScheduleType) {
			return false, nil
		}

		switch selectiveFeature.ValueType {
		case StringValueType:
			return false, fmt.Errorf("selective feature, %s:%s, is not an IntValueType. Consider using ShouldCustomInt", selectiveFeature.Name, selectiveFeature.FeatureId)
		case NumberValueType:

			switch selectiveFeature.NumberType {
			case IntNumberType:
				selectiveIntFeature := environment.SelectiveIntFeatures[realIds.RealFeatureId]

				for i := range selectiveIntFeature.Value {
					if selectiveIntFeature.Value[i] == customInstanceId {
						return true, nil
					}
				}

			case FloatNumberType:
				return false, fmt.Errorf("selectivefeature, %s:%s, is not an IntValueType. Consider using ShouldCustomFloat", selectiveFeature.Name, selectiveFeature.FeatureId)
			}
		}

	case ValueFeatureType:
		return false, fmt.Errorf("selectivefeature, %s:%s, is not a StringValueType. Consider using ValueString, ValueInt, or ValueFloat", rawFeature.Name, rawFeature.FeatureId)

	}

	return false, nil
}

// Checks if a toggle, gradual, or selective flag should be enabled. Uses a custom instance ID as an float64 rather than the string set in the Client. Other methods exist for other flag types, such as value.
func (client Client) ShouldCustomFloat(groupNameOrId string, featureNameOrId string, customInstanceId float64) (bool, error) {

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	environment := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId]

	if environment.EnvironmentId == "" {
		return false, fmt.Errorf("no environment found for environmentId: %s", realIds.RealEnvironmentId)
	}

	switch rawFeature.FeatureType {
	case ToggleFeatureType:
		toggleFeature := environment.ToggleFeatures[realIds.RealFeatureId]
		if !IsScheduleActive(toggleFeature.Schedule, toggleFeature.ScheduleType) {
			return false, nil
		}
		return toggleFeature.Value, nil
	case GradualFeatureType:
		gradualFeature := environment.GradualFeatures[realIds.RealFeatureId]
		if !IsScheduleActive(gradualFeature.Schedule, gradualFeature.ScheduleType) {
			return false, nil
		}
		return HashFloatInstanceID(customInstanceId, gradualFeature.Seed) < gradualFeature.Value, nil

	case SelectiveFeatureType:

		selectiveFeature := environment.SelectiveFeatures[realIds.RealFeatureId]

		if !IsScheduleActive(selectiveFeature.Schedule, selectiveFeature.ScheduleType) {
			return false, nil
		}

		switch selectiveFeature.ValueType {
		case StringValueType:
			return false, fmt.Errorf("selective feature, %s:%s, is not an IntValueType. Consider using ShouldCustomInt", selectiveFeature.Name, selectiveFeature.FeatureId)
		case NumberValueType:
			switch selectiveFeature.NumberType {
			case IntNumberType:
				return false, fmt.Errorf("selectivefeature, %s:%s, is not a IntValueType. Consider using ShouldCustomInt", selectiveFeature.Name, selectiveFeature.FeatureId)

			case FloatNumberType:
				selectiveFloatFeature := environment.SelectiveFloatFeatures[realIds.RealFeatureId]

				for i := range selectiveFloatFeature.Value {
					if selectiveFloatFeature.Value[i] == customInstanceId {
						return true, nil
					}
				}
			}
		}
	case ValueFeatureType:
		return false, fmt.Errorf("selectivefeature, %s:%s, is not a ValueFeatureType. Consider using ValueString, ValueInt, or ValueFloat", rawFeature.Name, rawFeature.FeatureId)

	}

	return false, nil
}

// Gets an environment specific string value and falls back to a default if the feature is outside of its schedule.
func (client *Client) ValueString(groupNameOrId string, featureNameOrId string, defaultValue string) (string, error) {

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return defaultValue, err
	}

	if rawFeature.FeatureType != "value" {
		return defaultValue, fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return defaultValue, err
	}

	valueStringFeature := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId].ValueStringFeatures[realIds.RealFeatureId]

	if valueStringFeature.FeatureId == "" {
		return defaultValue, fmt.Errorf("value feature not found for groupId (%s) and featureId (%s)", realIds.RealGroupId, realIds.RealFeatureId)
	}

	if !IsScheduleActive(valueStringFeature.Schedule, valueStringFeature.ScheduleType) {
		return defaultValue, nil
	}

	return valueStringFeature.Value, nil
}

// Gets an environment specific int64 value and falls back to a default if the feature is outside of its schedule.
func (client *Client) ValueInt(groupNameOrId string, featureNameOrId string, defaultValue int64) (int64, error) {

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return defaultValue, err
	}

	if rawFeature.FeatureType != ValueFeatureType {
		return defaultValue, fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	if err != nil {
		return defaultValue, err
	}

	if rawFeature.FeatureType != ValueFeatureType {
		return defaultValue, fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return defaultValue, err
	}

	valueIntFeature := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId].ValueIntFeatures[realIds.RealFeatureId]

	if valueIntFeature.FeatureId == "" {
		return defaultValue, fmt.Errorf("value feature not found for groupId (%s) and featureId (%s)", realIds.RealGroupId, realIds.RealFeatureId)
	}

	if !IsScheduleActive(valueIntFeature.Schedule, valueIntFeature.ScheduleType) {
		return defaultValue, nil
	}

	return valueIntFeature.Value, nil
}

// Gets an environment specific float64 value and falls back to a default if the feature is outside of its schedule.
func (client *Client) ValueFloat(groupNameOrId string, featureNameOrId string, defaultValue float64) (float64, error) {
	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return defaultValue, err
	}

	if rawFeature.FeatureType != ValueFeatureType {
		return defaultValue, fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return defaultValue, err
	}

	valueFloatFeature := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId].ValueFloatFeatures[realIds.RealFeatureId]

	if valueFloatFeature.FeatureId == "" {
		return defaultValue, fmt.Errorf("value feature not found for groupId (%s) and featureId (%s)", realIds.RealGroupId, realIds.RealFeatureId)
	}

	if !IsScheduleActive(valueFloatFeature.Schedule, valueFloatFeature.ScheduleType) {
		return defaultValue, nil
	}

	return valueFloatFeature.Value, nil
}

func (client *Client) getRawFeature(groupNameOrId string, featureNameOrId string) (Feature, error) {
	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return Feature{}, err
	}

	rawFeature := client.FlagGroups[realIds.RealGroupId].Features[realIds.RealFeatureId]

	if rawFeature.FeatureId == "" {
		return Feature{}, fmt.Errorf("feature (%s) could not be found for group (%s) or environment (%s). realIds: %s", featureNameOrId, groupNameOrId, client.Environment, realIds)
	}

	return rawFeature, nil

}

func (client *Client) getRealIds(groupNameOrId string, featureNameOrId string) (RealIds, error) {
	groupId := client.groupLookupTable[groupNameOrId]

	if groupId == "" {
		return RealIds{}, fmt.Errorf("no group found for: %s", groupNameOrId)
	}

	featureId := client.featureLookupTable[groupId][featureNameOrId]

	if featureId == "" {
		return RealIds{}, fmt.Errorf("no feature found for: %s", featureNameOrId)
	}

	environmentId := client.environmentLookupTable[groupId][client.Environment]

	if featureId == "" {
		return RealIds{}, fmt.Errorf("no environment found for: %s", client.Environment)
	}

	return RealIds{
		RealGroupId:       groupId,
		RealFeatureId:     featureId,
		RealEnvironmentId: environmentId,
	}, nil

}
