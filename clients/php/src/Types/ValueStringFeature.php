<?php

namespace Vexilla\Types;

class ValueStringFeature extends ValueFeature {
    public string $value;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, string $valueType, string $value) {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule, $valueType);
        $this->value = $value;
    }

    public static function fromRaw(object $rawFeature): ValueStringFeature
    {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ValueStringFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType, $rawFeature->value);
    }
}
