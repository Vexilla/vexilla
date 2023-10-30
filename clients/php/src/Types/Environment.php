<?php

namespace Vexilla\Types;

class Environment {
    public string $name;
    public string $environmentId;
    public array $features;

    function __construct(string $name, string $environmentId, array $features) {
        $this->name = $name;
        $this->environmentId = $environmentId;
        $this->features = $features;
    }

    function getFeature(string $featureId): ?Feature {
        $feature = $this->features[$featureId];
        if ($feature) {
            return $feature;
        } else {
            return null;
        }
    }

    function getToggleFeature(string $featureId): ?ToggleFeature {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::TOGGLE) {
            return $feature;
        } else {
            return null;
        }
    }

    function getGradualFeature(string $featureId): ?GradualFeature {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::GRADUAL) {
            return $feature;
        } else {
            return null;
        }
    }

    function getSelectiveFeature(string $featureId): ?SelectiveFeature {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::SELECTIVE) {
            return $feature;
        } else {
            return null;
        }
    }

    function getValueStringFeature(string $featureId): ?ValueStringFeature {
        $feature = $this->features[$featureId];

        if ($feature && $feature->featureType === FeatureType::VALUE && $feature->valueType === ValueType::STRING) {
            return $feature;
        } else {
            return null;
        }
    }

    function getValueIntFeature(string $featureId): ?ValueIntFeature {
        $feature = $this->features[$featureId];

        if ($feature && $feature->featureType === FeatureType::VALUE && $feature->numberType === NumberType::INT) {
            return $feature;
        } else {
            return null;
        }
    }

    function getValueFloatFeature(string $featureId): ?ValueFloatFeature {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::VALUE && $feature->numberType === NumberType::FLOAT) {
            return $feature;
        } else {
            return null;
        }
    }

}
