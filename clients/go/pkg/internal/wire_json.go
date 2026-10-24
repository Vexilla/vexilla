package internal

import "encoding/json"

func (manifest *Manifest) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateManifest)
	if err != nil {
		return err
	}
	type wire Manifest
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*manifest = Manifest(decoded)
	return nil
}
func (group *Group) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateGroup)
	if err != nil {
		return err
	}
	type wire Group
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*group = Group(decoded)
	return nil
}
func (schedule *Schedule) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateSchedule)
	if err != nil {
		return err
	}
	type wire Schedule
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*schedule = Schedule(decoded)
	return nil
}
func (feature *ToggleFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire ToggleFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = ToggleFeature(decoded)
	return nil
}
func (feature *GradualFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire GradualFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = GradualFeature(decoded)
	return nil
}
func (feature *SelectiveStringFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire SelectiveStringFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = SelectiveStringFeature(decoded)
	return nil
}
func (feature *SelectiveIntFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire SelectiveIntFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = SelectiveIntFeature(decoded)
	return nil
}
func (feature *SelectiveFloatFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire SelectiveFloatFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = SelectiveFloatFeature(decoded)
	return nil
}
func (feature *ValueStringFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire ValueStringFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = ValueStringFeature(decoded)
	return nil
}
func (feature *ValueIntFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire ValueIntFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = ValueIntFeature(decoded)
	return nil
}
func (feature *ValueFloatFeature) UnmarshalJSON(data []byte) error {
	normalized, err := normalizedWire(data, validateFeature)
	if err != nil {
		return err
	}
	type wire ValueFloatFeature
	var decoded wire
	if err := json.Unmarshal(normalized, &decoded); err != nil {
		return err
	}
	*feature = ValueFloatFeature(decoded)
	return nil
}

func (environment Environment) MarshalJSON() ([]byte, error) {
	features := map[FeatureId]json.RawMessage{}
	add := func(id FeatureId, value interface{}) error {
		if _, exists := features[id]; exists {
			return ValidationError("Duplicate typed environment feature")
		}
		data, err := json.Marshal(value)
		if err != nil {
			return err
		}
		features[id] = data
		return nil
	}
	for id, feature := range environment.ToggleFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	for id, feature := range environment.GradualFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	for id, feature := range environment.SelectiveStringFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	for id, feature := range environment.SelectiveIntFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	for id, feature := range environment.SelectiveFloatFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	for id, feature := range environment.ValueStringFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	for id, feature := range environment.ValueIntFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	for id, feature := range environment.ValueFloatFeatures {
		if err := add(id, feature); err != nil {
			return nil, err
		}
	}
	if !environment.decoded && len(features) == 0 {
		features = environment.RawFeatures
	}
	return json.Marshal(BaseEnvironment{Name: environment.Name, EnvironmentId: environment.EnvironmentId, RawFeatures: features})
}
