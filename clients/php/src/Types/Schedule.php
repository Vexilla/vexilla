<?php

namespace Vexilla\Types;

class Schedule
{
    public int $start;
    public int $end;
    public string $timezone;
    public string $timeType;
    public int $startTime;
    public int $endTime;

    public function __construct(int $start = 0, int $end = 0, string $timezone = 'UTC', string $timeType = ScheduleTimeType::NONE, int $startTime = 0, int $endTime = 0)
    {
        $this->start = $start;
        $this->end = $end;
        $this->timezone = $timezone;
        $this->timeType = $timeType;
        $this->startTime = $startTime;
        $this->endTime = $endTime;
    }

    static public function fromRaw(object $rawSchedule) : Schedule {
        return new Schedule(
            $rawSchedule->start,
            $rawSchedule->end,
            $rawSchedule->timezone,
            $rawSchedule->timeType,
            $rawSchedule->startTime,
            $rawSchedule->endTime,
        );
    }
}