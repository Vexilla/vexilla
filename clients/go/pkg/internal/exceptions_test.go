package internal

import "testing"

func TestGroupLookupError(t *testing.T) {
	groupNameOrId := "somegroup"

	err := NewGroupLookupError(groupNameOrId)

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	expectedMessage := "could not get group by key: 'somegroup'"
	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	if _, ok := err.(*GroupLookupError); !ok {
		t.Errorf("Expected error type to be GroupLookupError but got %T", err)
	}
}

func TestEnvironmentLookupError(t *testing.T) {
	groupNameOrId := "somegroup"
	environmentNameOrId := "someenvironment"

	err := NewEnvironmentLookupError(groupNameOrId, environmentNameOrId)

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	expectedMessage := "could not get environment by key: 'someenvironment' in group: 'somegroup'"
	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	if _, ok := err.(*EnvironmentLookupError); !ok {
		t.Errorf("Expected error type to be EnvironmentLookupError but got %T", err)
	}
}

func TestFeatureLookUpError(t *testing.T) {
	groupNameOrId := "somegroup"
	featureNameOrId := "somefeature"
	environmentNameOrId := "someenvironment"

	err := NewFeatureLookUpError(groupNameOrId, featureNameOrId, environmentNameOrId)

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	expectedMessage := "could not get feature by key: 'somefeature' in group: 'somegroup' or environment: 'someenvironment'"
	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	if _, ok := err.(*FeatureLookUpError); !ok {
		t.Errorf("Expected error type to be FeatureLookUpError but got %T", err)
	}
}

func TestFeatureTypeError(t *testing.T) {
	featureNameOrId := "somefeature"
	expectedMessage := "feature (somefeature) is not one of the accepted types '[value]' but is type: 'gradual'"

	err := NewFeatureTypeError(featureNameOrId, []FeatureType{ValueFeatureType}, GradualFeatureType)

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	if _, ok := err.(*FeatureTypeError); !ok {
		t.Errorf("Expected error type to be FeatureTypeError but got %T", err)
	}
}

func TestFeatureTypeErrorWithMultipleAcceptedFeatureTypes(t *testing.T) {
	featureNameOrId := "somefeature"
	expectedMessage := "feature (somefeature) is not one of the accepted types '[gradual, toggle, selective]' but is type: 'value'"

	err := NewFeatureTypeError(featureNameOrId, []FeatureType{GradualFeatureType, ToggleFeatureType, SelectiveFeatureType}, ValueFeatureType)

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	if _, ok := err.(*FeatureTypeError); !ok {
		t.Errorf("Expected error type to be FeatureTypeError but got %T", err)
	}
}

func TestSelectiveFeatureValueTypeError(t *testing.T) {
	featureNameOrId := FeatureId("somefeature")
	expectedMessage := "selective feature 'somefeature' expected value type: 'string' but got type: 'int'"

	err := NewSelectiveFeatureValueTypeError(featureNameOrId, string(StringValueType), string(IntNumberType))

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	if _, ok := err.(*SelectiveFeatureValueTypeError); !ok {
		t.Errorf("Expected error type to be SelectiveFeatureValueTypeError but got %T", err)
	}
}

func TestDifferentErrorTypesAreNotTheSameWhenTypeChecking(t *testing.T) {
	groupNameOrId := "somegroup"
	environmentNameOrId := "someenvironment"

	groupError := NewGroupLookupError(groupNameOrId)
	environmentError := NewEnvironmentLookupError(groupNameOrId, environmentNameOrId)

	if _, ok := groupError.(*EnvironmentLookupError); ok {
		t.Errorf("Expected error type to be different but got %T", groupError)
	}

	if _, ok := environmentError.(*GroupLookupError); ok {
		t.Errorf("Expected error type to be different but got %T", environmentError)
	}
}
