<?php
declare(strict_types=1);
namespace VexillaTest;

require 'vendor/autoload.php';

use Carbon\Carbon;
use PHPUnit\Framework\TestCase;
use Vexilla\Scheduler;
use Vexilla\Types\Schedule;
use Vexilla\Types\ScheduleTimeType;
use Vexilla\Types\ScheduleType;

final class SchedulerTest extends TestCase
{

  public function testActiveNone()
  {
    $schedule = new Schedule(0, 0, 'UTC', ScheduleTimeType::NONE, 0, 0);
    $this->assertTrue(Scheduler::isScheduleActive($schedule, ScheduleType::EMPTY ));
  }
  public function testActiveStartEnd()
  {
    $now = Carbon::now();

    $beforeSchedule = new Schedule(
      $now->clone()->addDay()->timestamp * 1000,
      $now->clone()->addDays(2)->timestamp * 1000,
      'UTC',
      ScheduleTimeType::START_END,
      0,
      0,
    );

    $isBeforeScheduleActive = Scheduler::isScheduleActive($beforeSchedule, ScheduleType::GLOBAL );

    $this->assertFalse($isBeforeScheduleActive);

    $duringSchedule = new Schedule(
      $now->clone()->subDay()->timestamp * 1000,
      $now->clone()->addDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::START_END,
      0,
      0,
    );

    $isDuringScheduleActive = Scheduler::isScheduleActive($duringSchedule, ScheduleType::GLOBAL );

    $this->assertTrue($isDuringScheduleActive);


    $AfterSchedule = new Schedule(
      $now->clone()->subDays(2)->timestamp * 1000,
      $now->clone()->subDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::START_END,
      0,
      0,
    );

    $isAfterScheduleActive = Scheduler::isScheduleActive($AfterSchedule, ScheduleType::GLOBAL );

    $this->assertFalse($isAfterScheduleActive);
  }

  public function testActiveDaily()
  {

    $now = Carbon::now();

    for ($hour = 0; $hour < 24; $hour++) {

      $mockedNow = Carbon::create(
        $now->year,
        $now->month,
        $now->day,
        $hour,
        0,
        0,
      );


      $beforeDaySchedule = new Schedule(
        $now->clone()->subDay()->timestamp * 1000,
        $now->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $mockedNow->clone()->addHour()->timestamp * 1000,
        $mockedNow->clone()->addHours(3)->timestamp * 1000,
      );

      $isBeforeDayScheduleActive = Scheduler::isScheduleActiveWithNow($beforeDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isBeforeDayScheduleActive);

      $duringDaySchedule = new Schedule(
        $now->clone()->subDay()->timestamp * 1000,
        $now->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $mockedNow->clone()->subHour()->timestamp * 1000,
        $mockedNow->clone()->addHour()->timestamp * 1000,
      );

      $isDuringDayScheduleActive = Scheduler::isScheduleActiveWithNow($duringDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertTrue($isDuringDayScheduleActive);


      $afterDaySchedule = new Schedule(
        $now->clone()->subDay()->timestamp * 1000,
        $now->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $mockedNow->clone()->subHours(3)->timestamp * 1000,
        $mockedNow->clone()->subHour()->timestamp * 1000,
      );

      $isAfterDayScheduleActive = Scheduler::isScheduleActiveWithNow($afterDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isAfterDayScheduleActive);
    }
  }
}
