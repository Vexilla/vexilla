<?php

namespace Vexilla\Types;

class ValueFloatFeature extends ValueFeature {
    public float $value;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, string $valueType, float $value) {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule, $valueType);
        $this->value = $value;
    }
}
