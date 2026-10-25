<?php

namespace Vexilla\Types;

class ToggleFeature extends Feature
{
    /** @var bool */
    public $value;
    function __construct($name, $featureId, $featureType, $scheduleType, Schedule $schedule, $value)
    {
        \Vexilla\Validation::check($schedule instanceof Schedule, 'Native Schedule required');
        $raw = (object) compact('name', 'featureId', 'featureType', 'scheduleType', 'schedule', 'value');
        $raw->schedule = (object) get_object_vars($schedule);
        \Vexilla\Validation::feature($raw);
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->value = $value;
    }
    public static function fromRaw(object $rawFeature) : ToggleFeature
    {
        \Vexilla\Validation::feature($rawFeature);
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ToggleFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->value);
    }
}
