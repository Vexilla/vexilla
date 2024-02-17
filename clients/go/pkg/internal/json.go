package internal

import (
	"encoding/json"
)

func (environment *Environment) UnmarshalJSON(bytes []byte) error {
	var baseEnvironment BaseEnvironment
	err := json.Unmarshal(bytes, &baseEnvironment)
	if err != nil {
		return err
	}

	environment.EnvironmentId = baseEnvironment.EnvironmentId
	environment.Name = baseEnvironment.Name
	environment.RawFeatures = baseEnvironment.RawFeatures

	for featureId, rawFeature := range baseEnvironment.RawFeatures {

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

			case NumberValueType:
				switch selectiveFeature.NumberType {
				case IntNumberType:
					var selectiveIntFeature SelectiveIntFeature
					err := json.Unmarshal(rawFeature, &selectiveIntFeature)
					if err != nil {
						return err
					}

					if environment.SelectiveIntFeatures == nil {
						environment.SelectiveIntFeatures = make(map[FeatureId]SelectiveIntFeature)
					}

					environment.SelectiveIntFeatures[featureId] = selectiveIntFeature

				case FloatNumberType:
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

			case NumberValueType:
				switch valueFeature.NumberType {
				case IntNumberType:
					var valueIntFeature ValueIntFeature
					err := json.Unmarshal(rawFeature, &valueIntFeature)
					if err != nil {
						return err
					}

					if environment.ValueIntFeatures == nil {
						environment.ValueIntFeatures = make(map[FeatureId]ValueIntFeature)
					}

					environment.ValueIntFeatures[featureId] = valueIntFeature

				case FloatNumberType:
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

	}

	return nil
}
