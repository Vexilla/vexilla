<?php

namespace Vexilla\Types;

use Vexilla\Exceptions\EnvironmentFeatureNotFound;
class Environment
{
    /** @var string */
    public $name;
    /** @var string */
    public $environmentId;
    public array $features;
    function __construct($name, $environmentId, array $features)
    {
        \Vexilla\Validation::text($name);
        \Vexilla\Validation::text($environmentId, true);
        \Vexilla\Validation::tree([$name, $environmentId]);
        $this->name = $name;
        $this->environmentId = $environmentId;
        $this->features = $features;
    }
    function getFeature(string $featureId) : ?Feature
    {
        $feature = $this->features[$featureId];
        if ($feature) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("Feature ({$featureId}) not found in environment.");
        }
    }
    function getToggleFeature(string $featureId) : ?ToggleFeature
    {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::TOGGLE) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("ToggleFeature ({$featureId}) not found in environment.");
        }
    }
    function getGradualFeature(string $featureId) : ?GradualFeature
    {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::GRADUAL) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("GradualFeature ({$featureId}) not found in environment.");
        }
    }
    function getSelectiveFeature(string $featureId) : ?SelectiveFeature
    {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::SELECTIVE) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("SelectiveFeature ({$featureId}) not found in environment.");
        }
    }
    function getValueFeature(string $featureId) : ?ValueFeature
    {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::VALUE && ($feature->valueType === ValueType::STRING || $feature->valueType === ValueType::NUMBER)) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("ValueFeature ({$featureId}) not found in environment.");
        }
    }
    function getValueStringFeature(string $featureId) : ?ValueStringFeature
    {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::VALUE && $feature->valueType === ValueType::STRING) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("ValueStringFeature ({$featureId}) not found in environment.");
        }
    }
    function getValueIntFeature(string $featureId) : ?ValueIntFeature
    {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::VALUE && $feature->valueType === ValueType::NUMBER && $feature->numberType === NumberType::INT) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("ValueIntFeature ({$featureId}) not found in environment.");
        }
    }
    function getValueFloatFeature(string $featureId) : ?ValueFloatFeature
    {
        $feature = $this->features[$featureId];
        if ($feature && $feature->featureType === FeatureType::VALUE && $feature->valueType === ValueType::NUMBER && $feature->numberType === NumberType::FLOAT) {
            return $feature;
        } else {
            throw new EnvironmentFeatureNotFound("ValueFloatFeature ({$featureId}) not found in environment.");
        }
    }
}
