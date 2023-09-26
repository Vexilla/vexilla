package internal

import (
	"encoding/json"
	"fmt"
)

func (environment *Environment) UnmarshalJSON(bytes []byte) error {

	err := json.Unmarshal(bytes, environment)
	if err != nil {
		return err
	}

	for featureId, rawFeature := range environment.RawFeatures {
		var baseFeature Feature
		err := json.Unmarshal(rawFeature, &baseFeature)
		if err != nil {
			return err
		}

		switch baseFeature.FeatureType {
		case ToggleFeatureType:
			var toggleFeature ToggleFeature
			err := json.Unmarshal(rawFeature, &toggleFeature)
			if err != nil {
				return err
			}

			if environment.ToggleFeatures == nil {
				environment.ToggleFeatures = make(map[FeatureId]ToggleFeature)
			}

			environment.ToggleFeatures[featureId] = toggleFeature

		case GradualFeatureType:
			var gradualFeature GradualFeature
			err := json.Unmarshal(rawFeature, &gradualFeature)
			if err != nil {
				return err
			}

			if environment.GradualFeatures == nil {
				environment.GradualFeatures = make(map[FeatureId]GradualFeature)
			}

			environment.GradualFeatures[featureId] = gradualFeature

		case SelectiveFeatureType:
			var selectiveFeature SelectiveFeature
			err := json.Unmarshal(rawFeature, &selectiveFeature)
			if err != nil {
				return err
			}

			if environment.SelectiveFeatures == nil {
				environment.SelectiveFeatures = make(map[FeatureId]SelectiveFeature)
			}

			environment.SelectiveFeatures[selectiveFeature.FeatureId] = selectiveFeature

			switch selectiveFeature.ValueType {
			case StringValueType:
				var selectiveStringFeature SelectiveStringFeature
				err := json.Unmarshal(rawFeature, &selectiveStringFeature)
				if err != nil {
					return err
				}

				if environment.SelectiveStringFeatures == nil {
					environment.SelectiveStringFeatures = make(map[FeatureId]SelectiveStringFeature)
				}

				environment.SelectiveStringFeatures[featureId] = selectiveStringFeature

			case IntValueType:
				var selectiveIntFeature SelectiveIntFeature
				err := json.Unmarshal(rawFeature, &selectiveIntFeature)
				if err != nil {
					return err
				}

				if environment.SelectiveIntFeatures == nil {
					environment.SelectiveIntFeatures = make(map[FeatureId]SelectiveIntFeature)
				}

				environment.SelectiveIntFeatures[featureId] = selectiveIntFeature

			case FloatValueType:
				var selectiveFloatFeature SelectiveFloatFeature
				err := json.Unmarshal(rawFeature, &selectiveFloatFeature)
				if err != nil {
					return err
				}

				if environment.SelectiveFloatFeatures == nil {
					environment.SelectiveFloatFeatures = make(map[FeatureId]SelectiveFloatFeature)
				}

				environment.SelectiveFloatFeatures[featureId] = selectiveFloatFeature

			}

		case ValueFeatureType:
			var valueFeature ValueFeature
			err := json.Unmarshal(rawFeature, &valueFeature)
			if err != nil {
				return err
			}

			if environment.ValueFeatures == nil {
				environment.ValueFeatures = make(map[FeatureId]ValueFeature)
			}

			environment.ValueFeatures[valueFeature.FeatureId] = valueFeature

			switch valueFeature.ValueType {
			case StringValueType:
				var valueStringFeature ValueStringFeature
				err := json.Unmarshal(rawFeature, &valueStringFeature)
				if err != nil {
					return err
				}

				if environment.ValueStringFeatures == nil {
					environment.ValueStringFeatures = make(map[FeatureId]ValueStringFeature)
				}

				environment.ValueStringFeatures[featureId] = valueStringFeature

			case IntValueType:
				var valueIntFeature ValueIntFeature
				err := json.Unmarshal(rawFeature, &valueIntFeature)
				if err != nil {
					return err
				}

				if environment.ValueIntFeatures == nil {
					environment.ValueIntFeatures = make(map[FeatureId]ValueIntFeature)
				}

				environment.ValueIntFeatures[featureId] = valueIntFeature

			case FloatValueType:
				var valueFloatFeature ValueFloatFeature
				err := json.Unmarshal(rawFeature, &valueFloatFeature)
				if err != nil {
					return err
				}

				if environment.ValueFloatFeatures == nil {
					environment.ValueFloatFeatures = make(map[FeatureId]ValueFloatFeature)
				}

				environment.ValueFloatFeatures[featureId] = valueFloatFeature

			}
		}

	}

	return nil
}

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

func (client Client) GetManifest(fetch func(url string) []byte) (Manifest, error) {
	url := fmt.Sprintf("%s/manifest.json", client.BaseURL)
	response := fetch(url)
	var fetchedManifest Manifest
	err := json.Unmarshal(response, &fetchedManifest)

	if err != nil {
		return Manifest{}, err
	}

	return fetchedManifest, nil
}

func (client *Client) SetManifest(manifest Manifest) {
	client.Manifest = manifest
}

func (client *Client) SyncManifest(fetch func(url string) []byte) error {
	newManifest, err := client.GetManifest(fetch)

	if err != nil {
		return err
	}

	client.SetManifest(newManifest)

	return nil
}

func (client *Client) GetFlags(groupNameOrId string, fetch func(url string) []byte) (Group, error) {

	groupId := client.groupLookupTable[groupNameOrId]

	if groupId == "" {
		return Group{}, fmt.Errorf("Group not found by Name or ID: %s", groupNameOrId)
	}

	url := fmt.Sprintf("%s/%s.json", client.BaseURL, groupId)
	response := fetch(url)
	var fetchedGroup Group
	err := json.Unmarshal(response, &fetchedGroup)

	if err != nil {
		return Group{}, err
	}

	return fetchedGroup, nil
}

func (client *Client) SetFlags(groupNameOrId string, group Group) error {
	groupId := client.groupLookupTable[groupNameOrId]

	if groupId == "" {
		return fmt.Errorf("no group found for: %s", groupNameOrId)
	}

	client.FlagGroups[groupId] = group

	return nil
}

func (client *Client) SyncFlags(groupNameOrId string, fetch func(url string) []byte) error {

	fetchedFlags, err := client.GetFlags(groupNameOrId, fetch)

	if err != nil {
		return err
	}

	return client.SetFlags(groupNameOrId, fetchedFlags)

}

func (client Client) Should(groupNameOrId string, featureNameOrId string) (bool, error) {

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return false, err
	}

	environment := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId]

	switch rawFeature.FeatureType {
	case ToggleFeatureType:
		toggleFeature := environment.ToggleFeatures[realIds.RealFeatureId]
		return toggleFeature.Value, nil
	case GradualFeatureType:
		gradualFeature := environment.GradualFeatures[realIds.RealFeatureId]
		return HashStringInstanceID(client.InstanceId, gradualFeature.Seed) > gradualFeature.Value, nil

	case SelectiveFeatureType:

		selectiveFeature := environment.SelectiveFeatures[realIds.RealFeatureId]

		switch selectiveFeature.ValueType {
		case StringValueType:
			selectiveStringFeature := environment.SelectiveStringFeatures[realIds.RealFeatureId]

			for i := range selectiveStringFeature.Value {
				if selectiveStringFeature.Value[i] == client.InstanceId {
					return true, nil
				}
			}
		case IntValueType:
			return false, fmt.Errorf("selective feature, %s:%s, is not a StringValueType. Consider using ShouldCustomInt", selectiveFeature.Name, selectiveFeature.FeatureId)

		case FloatValueType:
			return false, fmt.Errorf("selectivefeature, %s:%s, is not a StringValueType. Consider using ShouldCustomFloat", selectiveFeature.Name, selectiveFeature.FeatureId)
		}

	case ValueFeatureType:
		return false, fmt.Errorf("selectivefeature, %s:%s, is not a StringValueType. Consider using ValueString, ValueInt, or ValueFloat", rawFeature.Name, rawFeature.FeatureId)

	}

	return false, nil
}

func (client *Client) ValueString(groupNameOrId string, featureNameOrId string) (string, error) {

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return "", err
	}

	if rawFeature.FeatureType != "value" {
		return "", fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return "", err
	}

	valueStringFeature := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId].ValueStringFeatures[realIds.RealFeatureId]

	if valueStringFeature.FeatureId == "" {
		return "", fmt.Errorf("value feature not found for groupId (%s) and featureId (%s)", realIds.RealGroupId, realIds.RealFeatureId)
	}

	return valueStringFeature.Value, nil
}

func (client *Client) ValueInt(groupNameOrId string, featureNameOrId string) (int64, error) {

	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return 0, err
	}

	if rawFeature.FeatureType != ValueFeatureType {
		return 0, fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	if err != nil {
		return 0, err
	}

	if rawFeature.FeatureType != ValueFeatureType {
		return 0, fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return 0, err
	}

	valueIntFeature := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId].ValueIntFeatures[realIds.RealFeatureId]

	if valueIntFeature.FeatureId == "" {
		return 0, fmt.Errorf("value feature not found for groupId (%s) and featureId (%s)", realIds.RealGroupId, realIds.RealFeatureId)
	}

	return valueIntFeature.Value, nil
}

func (client *Client) ValueFloat(groupNameOrId string, featureNameOrId string) (float64, error) {
	rawFeature, err := client.getRawFeature(groupNameOrId, featureNameOrId)

	if err != nil {
		return 0.0, err
	}

	if rawFeature.FeatureType != ValueFeatureType {
		return 0.0, fmt.Errorf("feature (%s) is not of type 'value'", featureNameOrId)
	}

	realIds, err := client.getRealIds(groupNameOrId, featureNameOrId)

	if err != nil {
		return 0.0, err
	}

	valueFloatFeature := client.FlagGroups[realIds.RealGroupId].Environments[realIds.RealEnvironmentId].ValueFloatFeatures[realIds.RealFeatureId]

	if valueFloatFeature.FeatureId == "" {
		return 0.0, fmt.Errorf("value feature not found for groupId (%s) and featureId (%s)", realIds.RealGroupId, realIds.RealFeatureId)
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
