package internal

import (
	"testing"
)

func TestInvalidShouldFeatureType(t *testing.T) {
	detail := "numeric"
	expectedMessage := "should only supports toggle, gradual, and selective feature types. Tried type: numeric"

	err := NewInvalidShouldFeatureTypeError(detail)

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	// Should not be of type InvalidShouldFeatureValueType
	_, ok := err.(*InvalidShouldFeatureType)
	if !ok {
		t.Errorf("Expected error type to be '*InvalidShouldFeatureType', got '%T'", err)
	}

	// Should not be of type InvalidShouldFeatureValueType
	_, ok2 := err.(*InvalidShouldFeatureValueType)
	if ok2 {
		t.Errorf("Expected error type to be '*InvalidShouldFeatureType', got '*InvalidShouldFeatureValueType'")
	}
}

func TestInvalidShouldFeatureValueType(t *testing.T) {
	detail := "numeric"
	expectedMessage := "should selective features use the instance_id which is a &str. tried type: numeric. consider using should_custom instead"

	err := NewInvalidShouldFeatureValueTypeError(detail)

	if err == nil {
		t.Errorf("Expected error to be not nil")
	}

	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}

	_, ok := err.(*InvalidShouldFeatureValueType)
	if !ok {
		t.Errorf("Expected error type to be '*InvalidShouldFeatureValueType', got '%T'", err)
	}
}
