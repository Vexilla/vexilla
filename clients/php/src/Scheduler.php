<?php

namespace Vexilla;

require 'vendor/autoload.php';

use Carbon\Carbon;
use Vexilla\Types\Feature;
use Vexilla\Types\Schedule;
use Vexilla\Types\ScheduleTimeType;
use Vexilla\Types\ScheduleType;

class Scheduler
{

    static function isScheduledFeatureActive(Feature $feature): bool
    {
        return Scheduler::isScheduleActive($feature->schedule, $feature->scheduleType);
    }

    static function isScheduleActive(Schedule $schedule, string $scheduleType): bool
    {
        return Scheduler::isScheduleActiveWithNow($schedule, $scheduleType, Carbon::now("UTC"));
    }

    static function isScheduleActiveWithNow(Schedule $schedule, string $scheduleType, Carbon $now): bool
    {

        switch ($scheduleType) {
            case ScheduleType::EMPTY:
                return true;

            case ScheduleType::ENVIRONMENT:
            case ScheduleType::GLOBAL:

                $startDate = Carbon::createFromTimestampMsUTC($schedule->start);
                $startOfStartDate = $startDate->clone();
                $startOfStartDate->setHours(0);
                $startOfStartDate->setMinutes(0);
                $startOfStartDate->setSeconds(0);
                $startOfStartDate->setMicroseconds(0);

                $endDate = Carbon::createFromTimestampMsUTC($schedule->end);
                $endOfEndDate = $endDate->clone()->setHours(23)->setMinutes(59)->setSeconds(59)->setMicroseconds(999_999_999);

                if (!$now->betweenIncluded($startOfStartDate, $endOfEndDate)) {
                    return false;
                }

                return Scheduler::isScheduleTimeActive($schedule->timeType, $now, $startDate, $schedule->startTime, $endDate, $schedule->endTime);

            default:
                return false;
        }
    }

    private static function isScheduleTimeActive(string $timeType, Carbon $now, Carbon $startDate, int $startTime, Carbon $endDate, int $endTime): bool
    {
        $nowMillis = $now->timestamp * 1000;

        switch ($timeType) {

            case ScheduleTimeType::NONE:
                return true;

            case ScheduleTimeType::START_END:

                $startOfStartDate = $startDate->clone();
                $startOfStartDate->setHours(0);
                $startOfStartDate->setMinutes(0);
                $startOfStartDate->setSeconds(0);
                $startOfStartDate->setMicroseconds(0);

                $startOfStartDateMillis = $startOfStartDate->timestamp * 1000;

                $startOfEndDate = $endDate->clone();
                $startOfEndDate->setHours(0);
                $startOfEndDate->setMinutes(0);
                $startOfEndDate->setSeconds(0);
                $startOfEndDate->setMicroseconds(0);

                $startOfEndDateMillis = $startOfEndDate->timestamp * 1000;

                $startDateTimestampWithStartTime = $startOfStartDateMillis + $startTime;
                $endDateTimestampWithEndTime = $startOfEndDateMillis + $endTime;

                return $startDateTimestampWithStartTime <= $nowMillis && $nowMillis <= $endDateTimestampWithEndTime;

            case ScheduleTimeType::DAILY:

                $zeroDay = Carbon::createFromTimestampMsUTC(0);

                $zeroDayWithNow = $zeroDay->clone()
                    ->setHours($now->hour)
                    ->setMinutes($now->minute)
                    ->setSeconds($now->second)
                    ->setMilliseconds($now->millisecond);

                $zeroDayWithNowTimestamp = $zeroDayWithNow->timestamp * 1000;

                if ($startTime > $endTime) {
                    return $startTime <= $zeroDayWithNowTimestamp || $zeroDayWithNowTimestamp <= $endTime;
                } else {
                    return $startTime <= $zeroDayWithNowTimestamp && $zeroDayWithNowTimestamp <= $endTime;
                }


            // if schedule.start_time > schedule.end_time {
            //     Some(
            //         schedule.start_time <= zero_day_with_now_time
            //             || schedule.end_time >= zero_day_with_now_time,
            //     )
            // } else {
            //     Some(
            //         schedule.start_time <= zero_day_with_now_time
            //             && schedule.end_time >= zero_day_with_now_time,
            //     )
            // }

            default:
                return false;
        }
    }
}
