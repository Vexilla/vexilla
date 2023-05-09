package internal

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
)

type VexillaClientConfig struct {
	Environment string
	BaseURL string
	CustomInstanceHash string
}

type VexillaFeature struct {
	Type string `json:"type"`
}

type VexillaToggleFeature struct {
	VexillaFeature
	Value bool `json:"value"`
}

type VexillaGradualFeature struct {
	VexillaFeature
	Value int `json:"value"`
	Seed float32 `json:"seed"`
}

type VexillaFlags struct {
	Environments map[string]map[string]map[string]VexillaFeature `json:"-"`

	toggleEnvironments map[string]map[string]map[string]VexillaToggleFeature `json:"-"`
	gradualEnvironments map[string]map[string]map[string]VexillaGradualFeature `json:"-"`

	RawEnvironments map[string]map[string]map[string]json.RawMessage `json:"environments"`
}

func (flags *VexillaFlags) UnmarshalJSON(bytes []byte) error {

	type vexillaFlags VexillaFlags

	err := json.Unmarshal(bytes, (*vexillaFlags)(flags))
	if err != nil {
		return err
	}

	for environmentKey, environment := range flags.RawEnvironments {
		for featureSetKey, featureSet := range environment {
			for featureKey, rawFeature := range featureSet {
				var vexillaFeature VexillaFeature
				err = json.Unmarshal(rawFeature, &vexillaFeature)
				if err != nil {
					return err
				}

				if flags.Environments == nil {
					flags.Environments = make(map[string]map[string]map[string]VexillaFeature)
				}

				if flags.Environments[environmentKey] == nil {
					flags.Environments[environmentKey] = make(map[string]map[string]VexillaFeature)
				}

				if flags.Environments[environmentKey][featureSetKey] == nil {
					flags.Environments[environmentKey][featureSetKey] = make(map[string]VexillaFeature)
				}

				flags.Environments[environmentKey][featureSetKey][featureKey] = vexillaFeature

				switch vexillaFeature.Type {
				case "toggle":
					var feature VexillaToggleFeature
					err := json.Unmarshal(rawFeature, &feature)
					if err != nil {
						return err
					}

					if flags.toggleEnvironments == nil {
						flags.toggleEnvironments = make(map[string]map[string]map[string]VexillaToggleFeature)
					}

					if flags.toggleEnvironments[environmentKey] == nil {
						flags.toggleEnvironments[environmentKey] = make(map[string]map[string]VexillaToggleFeature)
					}

					if flags.toggleEnvironments[environmentKey][featureSetKey] == nil {
						flags.toggleEnvironments[environmentKey][featureSetKey] = make(map[string]VexillaToggleFeature)
					}

					flags.toggleEnvironments[environmentKey][featureSetKey][featureKey] = feature
					// feature = &VexillaToggleFeature{}
				case "gradual":
					var feature VexillaGradualFeature
					err := json.Unmarshal(rawFeature, &feature)
					if err != nil {
						return err
					}

					if flags.gradualEnvironments == nil {
						flags.gradualEnvironments = make(map[string]map[string]map[string]VexillaGradualFeature)
					}

					if flags.gradualEnvironments[environmentKey] == nil {
						flags.gradualEnvironments[environmentKey] = make(map[string]map[string]VexillaGradualFeature)
					}

					if flags.gradualEnvironments[environmentKey][featureSetKey] == nil {
						flags.gradualEnvironments[environmentKey][featureSetKey] = make(map[string]VexillaGradualFeature)
					}

					flags.gradualEnvironments[environmentKey][featureSetKey][featureKey] = feature

				default:
					return errors.New("unknown Feature type")
				}


			}
		}
	}

	return nil
}

type VexillaClientInterface interface {
	FetchFlags() VexillaFlags
	should(string) bool
}

type VexillaClient struct {
	config VexillaClientConfig
	flags VexillaFlags
}

func NewVexillaClient(environment string, baseURL string, customInstanceHash string) (VexillaClient) {
	return VexillaClient {
		config: VexillaClientConfig {
			Environment: environment,
			BaseURL: baseURL,
			CustomInstanceHash: customInstanceHash,
		},
	}
}

// What is cleaner? pointer or returned value?
func (client *VexillaClient) SetFlags(flags VexillaFlags) {
	client.flags = flags
}

func (client VexillaClient) FetchFlags(fileName string) (VexillaFlags, error) {

	url := fmt.Sprintf("%v/%v", client.config.BaseURL, fileName)
	response, err := http.Get(url)
	if err != nil {
		return VexillaFlags{}, err
	}

	decoder := json.NewDecoder(response.Body)

	var flags VexillaFlags
	// err := json.Unmarshal(response.Body, flags)
	err = decoder.Decode((&flags))
	if err != nil {
		return VexillaFlags{}, err
	}

	return flags, nil
}

func (client VexillaClient) Should(featureName string) bool {

	feature := client.flags.Environments[client.config.Environment]["untagged"][featureName]

	switch feature.Type {
		case "toggle":
			feature := client.flags.toggleEnvironments[client.config.Environment]["untagged"][featureName]
			return feature.Value

		case "gradual":
			feature := client.flags.gradualEnvironments[client.config.Environment]["untagged"][featureName]
			return HashInstanceID(client.config.CustomInstanceHash, feature.Seed) <= feature.Value

		default:
			return false
	}
}

func HashInstanceID(instanceID string, seed float32) int {
	chars := ([]byte)(instanceID)

	total := 0
	for _, char := range chars {
		total += (int)(char)
	}

	base := float32(total) * seed * 42.0

	return int(math.Trunc(float64(base))) % 100

}
