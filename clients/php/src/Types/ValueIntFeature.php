<?php

namespace Vexilla\Types;

class ValueIntFeature extends ValueFeature {
    public int $value;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, string $valueType, int $value) {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule, $valueType);
        $this->value = $value;
    }

    public static function fromRaw(object $rawFeature): ValueIntFeature
    {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ValueIntFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType, $rawFeature->value);
    }
}
