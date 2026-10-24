<?php

namespace Vexilla\Types;

class Feature
{
    /** @var string */
    public $name;
    /** @var string */
    public $featureId;
    /** @var string */
    public $featureType;
    /** @var string */
    public $scheduleType;
    public Schedule $schedule;
    function __construct($name, $featureId, $featureType, $scheduleType, Schedule $schedule)
    {
        \Vexilla\Validation::text($name);
        \Vexilla\Validation::text($featureId, true);
        \Vexilla\Validation::tree([$name, $featureId]);
        \Vexilla\Validation::check(is_string($featureType) && in_array($featureType, ['toggle', 'gradual', 'selective', 'value'], true), 'Invalid native feature type');
        \Vexilla\Validation::check(is_string($scheduleType) && in_array($scheduleType, ['', 'global', 'environment'], true), 'Invalid native schedule type');
        \Vexilla\Validation::check($schedule instanceof Schedule, 'Native Schedule required');
        \Vexilla\Validation::schedule((object) get_object_vars($schedule));
        $this->name = $name;
        $this->featureId = $featureId;
        $this->featureType = $featureType;
        $this->scheduleType = $scheduleType;
        $this->schedule = $schedule;
    }
    public static function fromRaw(object $rawFeature) : Feature
    {
        \Vexilla\Validation::feature($rawFeature);
        return \Vexilla\Codec::feature($rawFeature);
    }
}
