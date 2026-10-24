<?php

namespace Vexilla\Types;

class ValueFeature extends Feature
{
    /** @var string */
    public $valueType;
    function __construct($name, $featureId, $featureType, $scheduleType, Schedule $schedule, $valueType)
    {
        \Vexilla\Validation::check(is_string($valueType) && in_array($valueType, ['string', 'number'], true), 'Native valueType must be string or number');
        parent::__construct($name, $featureId, $featureType, $scheduleType, $schedule);
        $this->valueType = $valueType;
    }
    public static function fromRaw(object $rawFeature) : ValueFeature
    {
        \Vexilla\Validation::feature($rawFeature);
        $schedule = Schedule::fromRaw($rawFeature->schedule);
        return new ValueFeature($rawFeature->name, $rawFeature->featureId, $rawFeature->featureType, $rawFeature->scheduleType, $schedule, $rawFeature->valueType);
    }
}
