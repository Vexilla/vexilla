<?php

namespace Vexilla\Types;

class SelectiveFeature extends Feature
{
    public array $value;
    /** @var string */
    public $valueType;
    /** @var string */
    public $numberType;
    function __construct($name, $featureId, $featureType, $scheduleType, Schedule $schedule, $valueType, array $value, $numberType)
    {
        \Vexilla\Validation::check($schedule instanceof Schedule, 'Native Schedule required');
        $raw = (object) compact('name', 'featureId', 'featureType', 'scheduleType', 'schedule', 'value', 'valueType', 'numberType');
        $raw->schedule = (object) get_object_vars($schedule);
        \Vexilla\Validation::feature($raw);
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->value = $value;
        $this->valueType = $valueType;
        $this->numberType = $numberType;
    }
    public static function fromRaw(object $rawFeature) : SelectiveFeature
    {
        \Vexilla\Validation::feature($rawFeature);
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new SelectiveFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType, $rawFeature->value, $rawFeature->numberType ?? '');
    }
}
