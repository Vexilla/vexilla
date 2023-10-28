<?

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
        return Scheduler::isScheduleActiveWithNow($schedule, $scheduleType, Carbon::now());
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

                echo "Made it past WHOLE check";

                $startTime = Carbon::createFromTimestampMsUTC($schedule->startTime);
                $endTime = Carbon::createFromTimestampMsUTC($schedule->endTime);

                return Scheduler::isScheduleTimeActive($schedule->timeType, $now, $startDate, $startTime, $endDate, $endTime);

            default:
                return false;
        }
    }

    private static function isScheduleTimeActive(string $timeType, Carbon $now, Carbon $startDate, Carbon $startTime, Carbon $endDate, Carbon $endTime): bool
    {
        switch ($timeType) {

            case ScheduleTimeType::NONE:
                return true;

            case ScheduleTimeType::START_END:

                $startDateTime = $startDate->clone();
                $startDateTime
                    ->setHours($startTime->hour)
                    ->setMinutes($startTime->minute)
                    ->setSeconds($startTime->second)
                    ->setMicroseconds($startTime->microsecond);


                $endDateTime = $endDate->clone();
                $endDateTime
                    ->setHours($endTime->hour)
                    ->setMinutes($endTime->minute)
                    ->setSeconds($endTime->second)
                    ->setMicroseconds($endTime->microsecond);

                return $now->betweenIncluded($startDateTime, $endDateTime);

            case ScheduleTimeType::DAILY:

                $zeroDay = Carbon::createFromTimestampMsUTC(0);
                $nowTimestamp = $now->timestamp * 1000;

                $todayZeroTimestamp = Carbon::create(
                    $now->year,
                    $now->month,
                    $now->day,
                )->timestamp * 1000;

                $zeroedStartTimestamp = Carbon::create(
                    $zeroDay->year,
                    $zeroDay->month,
                    $zeroDay->day,
                    $startTime->hour,
                    $startTime->minute,
                    $startTime->second,
                )->timestamp * 1000;


                $zeroedEndDateTime = Carbon::create(
                    $zeroDay->year,
                    $zeroDay->month,
                    $zeroDay->day,
                    $endTime->hour,
                    $endTime->minute,
                    $endTime->second,
                );

                $zeroedEndTimestamp = $zeroedEndDateTime->timestamp * 1000;

                $zeroedEndTimestampPlusDay = $zeroedEndDateTime->clone()->addDay()->timestamp * 1000;

                $startTimestamp = $todayZeroTimestamp + $zeroedStartTimestamp;

                $endTimestamp = $todayZeroTimestamp + $zeroedEndTimestamp;

                if ($zeroedStartTimestamp > $zeroedEndTimestamp) {
                    $endTimestamp = $todayZeroTimestamp + $zeroedEndTimestampPlusDay;
                }

                return $startTimestamp <= $nowTimestamp && $nowTimestamp >= $endTimestamp;

            default:
                return false;
        }
    }
}
