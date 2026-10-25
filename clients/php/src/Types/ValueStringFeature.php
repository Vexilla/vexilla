<?php

namespace Vexilla\Types;

class ValueStringFeature extends ValueFeature
{
    /** @var string */
    public $value;
    function __construct($name, $featureId, $featureType, $scheduleType, Schedule $schedule, $valueType, $value)
    {
        \Vexilla\Validation::check($schedule instanceof Schedule, 'Native Schedule required');
        $raw = (object) compact('name', 'featureId', 'featureType', 'scheduleType', 'schedule', 'value', 'valueType');
        $raw->schedule = (object) get_object_vars($schedule);
        \Vexilla\Validation::feature($raw);
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule, $valueType);
        $this->value = $value;
    }
    public static function fromRaw(object $rawFeature) : ValueStringFeature
    {
        \Vexilla\Validation::feature($rawFeature);
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ValueStringFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType, $rawFeature->value);
    }
}
