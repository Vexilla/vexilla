<?php

namespace Vexilla\Types;

class ValueIntFeature extends ValueFeature
{
    /** @var int */
    public $value;
    function __construct($name, $featureId, $featureType, $scheduleType, Schedule $schedule, $valueType, $value, $numberType)
    {
        \Vexilla\Validation::check($schedule instanceof Schedule, 'Native Schedule required');
        $raw = (object) compact('name', 'featureId', 'featureType', 'scheduleType', 'schedule', 'value', 'valueType', 'numberType');
        $raw->schedule = (object) get_object_vars($schedule);
        \Vexilla\Validation::feature($raw);
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule, $valueType);
        $this->value = $value;
        $this->numberType = $numberType;
    }
    public static function fromRaw(object $rawFeature) : ValueIntFeature
    {
        \Vexilla\Validation::feature($rawFeature);
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ValueIntFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType, $rawFeature->value, $rawFeature->numberType);
    }
}
