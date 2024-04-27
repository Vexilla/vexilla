package internal

import "fmt"

type VexillaError struct {
	Type    string
	Message string
	Detail  string
}

func (e VexillaError) Error() string {
	return fmt.Sprintf("%s: %s", e.Message, e.Detail)
}

func NewVexillaError(errType, detail string) error {
	messages := map[string]string{
		"InvalidShouldFeatureType":       "should only supports toggle, gradual, and selective feature types. Tried type: %s",
		"InvalidShouldFeatureValueType":  "should selective features use the instance_id which is a &str. tried type: %s. consider using should_custom instead.",
		"InvalidShouldCustomFeatureType": "should_custom only supports toggle, gradual, and selective feature types. Tried type: %s",
		"InvalidShouldCustomStr":         "should_custom_str only allows &str for the custom_id. the type passed in does not match the value type of the feature. tried type: %s",
		"InvalidShouldCustomInt":         "should_custom_int only allows i64 for the custom_id. the type passed in does not match the value type of the feature. tried type: %s",
		"InvalidShouldCustomFloat":       "should_custom_float only allows f64 for the custom_id. the type passed in does not match the value type of the feature. tried type: %s",
		"InvalidValueFeatureType":        "value only supports the value feature type. tried type: %s",
		"InvalidValueStringType":         "value_str only supports a string value. tried type: %s",
		"InvalidValueI64Type":            "value_i64 only supports an i64 value. tried type: %s",
		"InvalidValueF64Type":            "value_f64 only supports an f64 value. tried type: %s",
		"InvalidSchedule":                "error parsing schedule: %s",
		"GroupLookupKeyNotFound":         "could not get key on group_lookup_table",
		"FlagLookupKeyNotFound":          "could not get key on group_lookup_table",
		"FlagGroupKeyNotFound":           "could not get key on group_lookup_table",
		"EnvironmentLookupKeyNotFound":   "could not get key on group_lookup_table",
		"EnvironmentFeatureKeyNotFound":  "could not get key on group_lookup_table",
		"UnknownVexillaError":            "unknown vexilla error",
	}

	if msg, ok := messages[errType]; ok {
		return fmt.Errorf(msg, detail)
	}

	return fmt.Errorf("unknown error type: %s", errType)
}
