<?php

namespace Vexilla\Types;

class ValueFloatFeature extends ValueFeature {
    public float $value;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, string $valueType, float $value, string $numberType) {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule, $valueType);
        $this->value = $value;
        $this->numberType = $numberType;
    }

    public static function fromRaw(object $rawFeature): ValueFloatFeature
    {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ValueFloatFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType, $rawFeature->value, $rawFeature->numberType);
    }
}
