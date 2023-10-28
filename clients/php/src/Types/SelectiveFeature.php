<?php

namespace Vexilla\Types;

class SelectiveFeature extends Feature {
    public array $value;
    public string $valueType;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, string $valueType, array $value) {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->value = $value;
        $this->valueType = $valueType;
    }

    public static function fromRaw(object $rawFeature): SelectiveFeature
    {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new SelectiveFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType, $rawFeature->value);
    }
}
