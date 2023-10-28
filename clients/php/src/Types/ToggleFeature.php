<?php

namespace Vexilla\Types;

class ToggleFeature extends Feature {
    public bool $value;


    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, bool $value) {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->value = $value;
    }

    public static function fromRaw(object $rawFeature): ToggleFeature
    {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ToggleFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->value);
    }
}
