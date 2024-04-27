package internal

import "testing"

func TestInvalidShouldFeatureType(t *testing.T) {
	errType := "InvalidShouldFeatureType"
	detail := "numeric"
	expectedMessage := "should only supports toggle, gradual, and selective feature types. Tried type: numeric"

	err := NewVexillaError(errType, detail)

	if err == nil {
		t.Fatalf("Expected an error to be returned, got nil")
	}

	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}
}

func TestInvalidShouldFeatureValueType(t *testing.T) {
	expectedMessage := "should selective features use the instance_id which is a &str. tried type: numeric. consider using should_custom instead."

	err := NewVexillaError("InvalidShouldFeatureValueType", "numeric")

	if err == nil {
		t.Fatalf("Expected an error to be returned, got nil")
	}

	if err.Error() != expectedMessage {
		t.Errorf("Expected error message to be '%s', got '%s'", expectedMessage, err.Error())
	}
}
