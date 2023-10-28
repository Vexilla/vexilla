<?php

namespace Vexilla\Types;

class ValueFeature extends Feature {
    public string $valueType;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, string $valueType) {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->valueType = $valueType;
    }


    public static function fromRaw(object $rawFeature): ValueFeature
    {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ValueFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType);
    }
}
