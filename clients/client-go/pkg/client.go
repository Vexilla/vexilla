package internal

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
)

type Flags struct {
	Environments map[string]map[string]map[string]Feature `json:"-"`

	toggleEnvironments map[string]map[string]map[string]ToggleFeature `json:"-"`
	gradualEnvironments map[string]map[string]map[string]GradualFeature `json:"-"`

	RawEnvironments map[string]map[string]map[string]json.RawMessage `json:"environments"`
}

func (flags *Flags) UnmarshalJSON(bytes []byte) error {

	type vexillaFlags Flags

	err := json.Unmarshal(bytes, (*vexillaFlags)(flags))
	if err != nil {
		return err
	}

	for environmentKey, environment := range flags.RawEnvironments {
		for featureSetKey, featureSet := range environment {
			for featureKey, rawFeature := range featureSet {
				var vexillaFeature Feature
				err = json.Unmarshal(rawFeature, &vexillaFeature)
				if err != nil {
					return err
				}

				if flags.Environments == nil {
					flags.Environments = make(map[string]map[string]map[string]Feature)
				}

				if flags.Environments[environmentKey] == nil {
					flags.Environments[environmentKey] = make(map[string]map[string]Feature)
				}

				if flags.Environments[environmentKey][featureSetKey] == nil {
					flags.Environments[environmentKey][featureSetKey] = make(map[string]Feature)
				}

				flags.Environments[environmentKey][featureSetKey][featureKey] = vexillaFeature

				switch vexillaFeature.FeatureType {
				case "toggle":
					var feature ToggleFeature
					err := json.Unmarshal(rawFeature, &feature)
					if err != nil {
						return err
					}

					if flags.toggleEnvironments == nil {
						flags.toggleEnvironments = make(map[string]map[string]map[string]ToggleFeature)
					}

					if flags.toggleEnvironments[environmentKey] == nil {
						flags.toggleEnvironments[environmentKey] = make(map[string]map[string]ToggleFeature)
					}

					if flags.toggleEnvironments[environmentKey][featureSetKey] == nil {
						flags.toggleEnvironments[environmentKey][featureSetKey] = make(map[string]ToggleFeature)
					}

					flags.toggleEnvironments[environmentKey][featureSetKey][featureKey] = feature
					// feature = &ToggleFeature{}
				case "gradual":
					var feature GradualFeature
					err := json.Unmarshal(rawFeature, &feature)
					if err != nil {
						return err
					}

					if flags.gradualEnvironments == nil {
						flags.gradualEnvironments = make(map[string]map[string]map[string]GradualFeature)
					}

					if flags.gradualEnvironments[environmentKey] == nil {
						flags.gradualEnvironments[environmentKey] = make(map[string]map[string]GradualFeature)
					}

					if flags.gradualEnvironments[environmentKey][featureSetKey] == nil {
						flags.gradualEnvironments[environmentKey][featureSetKey] = make(map[string]GradualFeature)
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

type ClientInterface interface {
	FetchFlags() Flags
	should(string) bool
}

type Client struct {
	config ClientConfig
	flags Flags
}

func NewClient(environment string, baseURL string, customInstanceHash string) (Client) {
	return Client {
		config: ClientConfig {
			Environment: environment,
			BaseURL: baseURL,
			InstanceId: customInstanceHash,
		},
	}
}

// What is cleaner? pointer or returned value?
func (client *Client) SetFlags(flags Flags) {
	client.flags = flags
}

func (client Client) FetchFlags(fileName string) (Flags, error) {

	url := fmt.Sprintf("%v/%v", client.config.BaseURL, fileName)
	response, err := http.Get(url)
	if err != nil {
		return Flags{}, err
	}

	decoder := json.NewDecoder(response.Body)

	var flags Flags
	// err := json.Unmarshal(response.Body, flags)
	err = decoder.Decode((&flags))
	if err != nil {
		return Flags{}, err
	}

	return flags, nil
}

func (client Client) Should(featureName string) bool {

	feature := client.flags.Environments[client.config.Environment]["untagged"][featureName]

	switch feature.FeatureType {
		case "toggle":
			feature := client.flags.toggleEnvironments[client.config.Environment]["untagged"][featureName]
			return feature.Value

		case "gradual":
			feature := client.flags.gradualEnvironments[client.config.Environment]["untagged"][featureName]
			return HashInstanceID(client.config.InstanceId, feature.Seed) <= feature.Value

		default:
			return false
	}
}
