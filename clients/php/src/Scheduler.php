<?php

namespace Vexilla;

use Carbon\Carbon;
use Vexilla\Types\Feature;
use Vexilla\Types\Schedule;
class Scheduler
{
    private const DAY = 86400000;
    private static function day(int $n) : int
    {
        return (int) floor($n / self::DAY) * self::DAY;
    }
    private static function mod(int $n) : int
    {
        return ($n % self::DAY + self::DAY) % self::DAY;
    }
    public static function isScheduledFeatureActive(Feature $feature) : bool
    {
        return self::isScheduleActive($feature->schedule, $feature->scheduleType);
    }
    public static function isScheduleActive(Schedule $schedule, string $scheduleType) : bool
    {
        return self::isScheduleActiveMillis($schedule, $scheduleType, (int) floor(microtime(true) * 1000));
    }
    public static function isScheduleActiveWithNow(Schedule $schedule, string $scheduleType, Carbon $now) : bool
    {
        return self::isScheduleActiveMillis($schedule, $scheduleType, $now->timestamp * 1000 + (int) floor($now->micro / 1000));
    }
    public static function isScheduleActiveMillis(Schedule $s, string $mode, int $now) : bool
    {
        if ($mode === '') {
            return true;
        }
        if ($now < self::day($s->start) || $now > self::day($s->end) + self::DAY - 1) {
            return false;
        }
        if ($s->timeType === 'none') {
            return true;
        }
        if ($s->timeType === 'start/end') {
            return $now >= self::day($s->start) + $s->startTime && $now <= self::day($s->end) + $s->endTime;
        }
        $clock = self::mod($now);
        $start = self::mod($s->startTime);
        $end = self::mod($s->endTime);
        return $start <= $end ? $clock >= $start && $clock <= $end : $clock >= $start || $clock <= $end;
    }
}
