<?php

namespace Vexilla\Types;

class GradualFeature extends Feature
{
    public float $value;
    public float $seed;

    function __construct(string $name, string $featureId, string $featureType, string $scheduleType, Schedule $schedule, float $value, float $seed)
    {
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->value = $value;
        $this->seed = $seed;
    }

    public static function fromRaw(object $rawFeature): GradualFeature
    {
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new GradualFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->value, $rawFeature->seed);
    }
}
