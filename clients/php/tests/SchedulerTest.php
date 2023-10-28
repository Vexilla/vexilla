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
    $this->assertTrue(Scheduler::isScheduleActive($schedule, ScheduleType::EMPTY));
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

    $isBeforeScheduleActive = Scheduler::isScheduleActive($beforeSchedule, ScheduleType::GLOBAL);

    $this->assertFalse($isBeforeScheduleActive);

    $duringSchedule = new Schedule(
      $now->clone()->subDay()->timestamp * 1000,
      $now->clone()->addDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::START_END,
      0,
      0,
    );

    $isDuringScheduleActive = Scheduler::isScheduleActive($duringSchedule, ScheduleType::GLOBAL);

    $this->assertTrue($isDuringScheduleActive);


    $AfterSchedule = new Schedule(
      $now->clone()->subDays(2)->timestamp * 1000,
      $now->clone()->subDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::START_END,
      0,
      0,
    );

    $isAfterScheduleActive = Scheduler::isScheduleActive($AfterSchedule, ScheduleType::GLOBAL);

    $this->assertFalse($isAfterScheduleActive);
  }

  public function testActiveDaily()
  {

    $now = Carbon::now();

    $beforeWholeSchedule = new Schedule(
      $now->clone()->addDay()->timestamp * 1000,
      $now->clone()->addDays(2)->timestamp * 1000,
      'UTC',
      ScheduleTimeType::DAILY,
      0,
      0,
    );

    $isBeforeWholeScheduleActive = Scheduler::isScheduleActive($beforeWholeSchedule, ScheduleType::GLOBAL);

    $this->assertFalse($isBeforeWholeScheduleActive);


    $beforeDaySchedule = new Schedule(
      $now->clone()->subDay()->timestamp * 1000,
      $now->clone()->addDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::DAILY,
      $now->clone()->addHour()->timestamp * 1000,
      $now->clone()->addHours(2)->timestamp * 1000,
    );

    $isBeforeDayScheduleActive = Scheduler::isScheduleActive($beforeDaySchedule, ScheduleType::GLOBAL);

    $this->assertFalse($isBeforeDayScheduleActive);

    $duringDaySchedule = new Schedule(
      $now->clone()->subDay()->timestamp * 1000,
      $now->clone()->addDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::DAILY,
      $now->clone()->subHour()->timestamp * 1000,
      $now->clone()->addHour()->timestamp * 1000,
    );

    $isDuringDayScheduleActive = Scheduler::isScheduleActive($duringDaySchedule, ScheduleType::GLOBAL);

    $this->assertTrue($isDuringDayScheduleActive);


    $afterDaySchedule = new Schedule(
      $now->clone()->subDay()->timestamp * 1000,
      $now->clone()->addDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::DAILY,
      $now->clone()->subHours(2)->timestamp * 1000,
      $now->clone()->subHour()->timestamp * 1000,
    );

    $isAfterDayScheduleActive = Scheduler::isScheduleActive($afterDaySchedule, ScheduleType::GLOBAL);

    $this->assertFalse($isAfterDayScheduleActive);


    $afterWholeSchedule = new Schedule(
      $now->clone()->subDays(2)->timestamp * 1000,
      $now->clone()->subDay()->timestamp * 1000,
      'UTC',
      ScheduleTimeType::DAILY,
      0,
      0,
    );

    $isAfterWholeScheduleActive = Scheduler::isScheduleActive($afterWholeSchedule, ScheduleType::GLOBAL);

    $this->assertFalse($isAfterWholeScheduleActive);
  }
}
