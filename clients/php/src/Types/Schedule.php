<?php

namespace Vexilla\Types;

class Schedule
{
    /** @var int */
    public $start;
    /** @var int */
    public $end;
    /** @var string */
    public $timezone;
    /** @var string */
    public $timeType;
    /** @var int */
    public $startTime;
    /** @var int */
    public $endTime;
    public function __construct($start = 0, $end = 0, $timezone = 'UTC', $timeType = ScheduleTimeType::NONE, $startTime = 0, $endTime = 0)
    {
        \Vexilla\Validation::schedule((object) compact('start', 'end', 'timezone', 'timeType', 'startTime', 'endTime'));
        $this->start = $start;
        $this->end = $end;
        $this->timezone = $timezone;
        $this->timeType = $timeType;
        $this->startTime = $startTime;
        $this->endTime = $endTime;
    }
    public static function fromRaw(object $rawSchedule) : Schedule
    {
        \Vexilla\Validation::schedule($rawSchedule);
        return new Schedule($rawSchedule->start, $rawSchedule->end, $rawSchedule->timezone, $rawSchedule->timeType, $rawSchedule->startTime, $rawSchedule->endTime);
    }
}
