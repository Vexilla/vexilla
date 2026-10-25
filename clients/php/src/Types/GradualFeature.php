<?php

namespace Vexilla\Types;

class GradualFeature extends Feature
{
    /** @var float */
    public $value;
    /** @var float */
    public $seed;
    function __construct($name, $featureId, $featureType, $scheduleType, Schedule $schedule, $value, $seed)
    {
        \Vexilla\Validation::check($schedule instanceof Schedule, 'Native Schedule required');
        $raw = (object) compact('name', 'featureId', 'featureType', 'scheduleType', 'schedule', 'value', 'seed');
        $raw->schedule = (object) get_object_vars($schedule);
        \Vexilla\Validation::feature($raw);
        if (!is_finite($seed) || $seed <= 0 || $seed > 1) {
            throw new \InvalidArgumentException('seed must be a finite number greater than 0 and less than or equal to 1');
        }
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->value = $value;
        $this->seed = $seed;
    }
    public static function fromRaw(object $rawFeature) : GradualFeature
    {
        \Vexilla\Validation::feature($rawFeature);
        if (!isset($rawFeature->seed) || !is_int($rawFeature->seed) && !is_float($rawFeature->seed)) {
            throw new \InvalidArgumentException('seed must be a number greater than 0 and less than or equal to 1');
        }
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new GradualFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->value, $rawFeature->seed);
    }
}
