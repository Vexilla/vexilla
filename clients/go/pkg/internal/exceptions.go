package internal

import (
	"fmt"
	"strings"
)

// Group lookup error.
type GroupLookupError struct {
	GroupKey string
}

func (e GroupLookupError) Error() string {
	return fmt.Sprintf("could not get group by key: '%s'", e.GroupKey)
}

func NewGroupLookupError(groupNameOrId string) error {
	return &GroupLookupError{GroupKey: groupNameOrId}
}

// Feature lookup error.
type FeatureLookUpError struct {
	GroupKey       string
	FeatureKey     string
	EnvironmentKey string
}

func (e FeatureLookUpError) Error() string {
	return fmt.Sprintf("could not get feature by key: '%s' in group: '%s' or environment: '%s'", e.FeatureKey, e.GroupKey, e.EnvironmentKey)
}

func NewFeatureLookUpError(groupKey string, featureKey string, environmentKey string) error {
	return &FeatureLookUpError{GroupKey: groupKey, FeatureKey: featureKey, EnvironmentKey: environmentKey}
}

// Environment lookup error.
type EnvironmentLookupError struct {
	GroupKey       string
	EnvironmentKey string
}

func (e EnvironmentLookupError) Error() string {
	return fmt.Sprintf("could not get environment by key: '%s' in group: '%s'", e.EnvironmentKey, e.GroupKey)
}

func NewEnvironmentLookupError(groupKey string, environmentKey string) error {
	return &EnvironmentLookupError{GroupKey: groupKey, EnvironmentKey: environmentKey}
}

// Feature type error.
type FeatureTypeError struct {
	FeatureKey          string
	AllowedFeatureTypes []FeatureType
	GivenFeatureType    FeatureType
}

func (e FeatureTypeError) Error() string {
	// Format the allowed feature types into a string to be better readable on the error message.
	allowedFeaturesTypes := make([]string, len(e.AllowedFeatureTypes))
	for i, featureType := range e.AllowedFeatureTypes {
		allowedFeaturesTypes[i] = string(featureType)
	}
	acceptedTypes := "[" + strings.Join(allowedFeaturesTypes, ", ") + "]"

	// Example: feature (featureKey) is not one of the accepted types '[gradual, selective, toggle]' but is type: 'value'
	return fmt.Sprintf("feature (%s) is not one of the accepted types '%s' but is type: '%s'", e.FeatureKey, acceptedTypes, e.GivenFeatureType)
}

func NewFeatureTypeError(featureKey string, allowedFeatureTypes []FeatureType, givenFeatureType FeatureType) error {
	return &FeatureTypeError{FeatureKey: featureKey, AllowedFeatureTypes: allowedFeatureTypes, GivenFeatureType: givenFeatureType}
}

// Selective feature value type error.
type SelectiveFeatureValueTypeError struct {
	FeatureKey        FeatureId
	ExpectedValueType string
	GivenValueType    string
}

func (e SelectiveFeatureValueTypeError) Error() string {
	return fmt.Sprintf("selective feature '%s' expected value type: '%s' but got type: '%s'", string(e.FeatureKey), e.ExpectedValueType, e.GivenValueType)
}

func NewSelectiveFeatureValueTypeError(featureKey FeatureId, expectedValueType string, givenValueType string) error {
	return &SelectiveFeatureValueTypeError{FeatureKey: featureKey, ExpectedValueType: expectedValueType, GivenValueType: givenValueType}
}
