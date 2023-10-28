<?php

namespace Vexilla\Types;

class Feature {
    public string $name;
    public string $featureId;
    public string $featureType;
    public string $scheduleType;
    public Schedule $schedule;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule) {
        $this->name = $name;
        $this->featureId = $featureId;
        $this->featureType = $featureType;
        $this->scheduleType = $scheduleType;
        $this->schedule = $schedule;
    }


    public static function fromRaw(object $rawFeature): Feature {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new Feature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule);
    }
}
