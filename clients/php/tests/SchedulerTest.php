<?php
declare(strict_types=1);
namespace Vexilla\Tests;

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
  public function testActiveStartEndSingleDay()
  {
    $now = Carbon::now();
    $zeroDay = Carbon::createFromTimestampMsUTC(0);

    for ($hour = 0; $hour < 24; $hour++) {

      $mockedNow = Carbon::create(
        $now->year,
        $now->month,
        $now->day,
        $hour,
        0,
        0,
      );

      $zeroDayWithMockedTime = $zeroDay->clone();
      $zeroDayWithMockedTime->setHours($hour);

      $beforeSchedule = new Schedule(
        $mockedNow->timestamp * 1000,
        $mockedNow->timestamp * 1000,
        'UTC',
        ScheduleTimeType::START_END,
        $zeroDayWithMockedTime->clone()->addHours(1)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHours(3)->timestamp * 1000,
      );

      $isBeforeScheduleActive = Scheduler::isScheduleActiveWithNow($beforeSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isBeforeScheduleActive, "Hour $hour: isBeforeScheduleActive");

      $duringSchedule = new Schedule(
        $mockedNow->timestamp * 1000,
        $mockedNow->timestamp * 1000,
        'UTC',
        ScheduleTimeType::START_END,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
      );

      $isDuringScheduleActive = Scheduler::isScheduleActiveWithNow($duringSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertTrue($isDuringScheduleActive, "Hour $hour: isDuringScheduleActive");


      $afterSchedule = new Schedule(
        $mockedNow->timestamp * 1000,
        $mockedNow->timestamp * 1000,
        'UTC',
        ScheduleTimeType::START_END,
        $zeroDayWithMockedTime->clone()->subHours(3)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->subHours(1)->timestamp * 1000,
      );

      $isAfterScheduleActive = Scheduler::isScheduleActiveWithNow($afterSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isAfterScheduleActive, "Hour $hour: isAfterScheduleActive");
    }
  }

  public function testActiveStartEndMultiDay()
  {
    $now = Carbon::now();
    $zeroDay = Carbon::createFromTimestampMsUTC(0);

    for ($hour = 0; $hour < 24; $hour++) {

      $mockedNow = Carbon::create(
        $now->year,
        $now->month,
        $now->day,
        $hour,
        0,
        0,
      );

      $zeroDayWithMockedTime = $zeroDay->clone();
      $zeroDayWithMockedTime->setHours($hour);

      $beforeSchedule = new Schedule(
        $mockedNow->clone()->addDay()->timestamp * 1000,
        $mockedNow->clone()->addDays(2)->timestamp * 1000,
        'UTC',
        ScheduleTimeType::START_END,
        $zeroDayWithMockedTime->clone()->addHours(1)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHours(3)->timestamp * 1000,
      );

      $isBeforeScheduleActive = Scheduler::isScheduleActiveWithNow($beforeSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isBeforeScheduleActive);

      $duringSchedule = new Schedule(
        $mockedNow->clone()->subDay()->timestamp * 1000,
        $mockedNow->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::START_END,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
      );

      $isDuringScheduleActive = Scheduler::isScheduleActiveWithNow($duringSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertTrue($isDuringScheduleActive);


      $AfterSchedule = new Schedule(
        $mockedNow->clone()->subDays(2)->timestamp * 1000,
        $mockedNow->clone()->subDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::START_END,
        $zeroDayWithMockedTime->clone()->subHours(3)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->subHours(1)->timestamp * 1000,
      );

      $isAfterScheduleActive = Scheduler::isScheduleActiveWithNow($AfterSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isAfterScheduleActive);
    }
  }

  public function testActiveDailySingleDay()
  {
    $now = Carbon::now("UTC");
    $zeroDay = Carbon::createFromTimestampMsUTC(0);

    for ($hour = 0; $hour < 24; $hour++) {

      $mockedNow = Carbon::create(
        $now->year,
        $now->month,
        $now->day,
        $hour,
        0,
        0,
      );

      $zeroDayWithMockedTime = $zeroDay->clone();
      $zeroDayWithMockedTime->setHours($hour);

      $beforeWholeSchedule = new Schedule(
        $mockedNow->clone()->addDay()->timestamp * 1000,
        $mockedNow->clone()->addDays(3)->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHours(3)->timestamp * 1000,
      );

      $isBeforeWholeScheduleActive = Scheduler::isScheduleActiveWithNow($beforeWholeSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isBeforeWholeScheduleActive, "Hour $hour: isBeforeWholeScheduleActive");

      $beforeDaySchedule = new Schedule(
        $mockedNow->clone()->subDay()->timestamp * 1000,
        $mockedNow->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHours(3)->timestamp * 1000,
      );

      $isBeforeDayScheduleActive = Scheduler::isScheduleActiveWithNow($beforeDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isBeforeDayScheduleActive, "Hour $hour: isBeforeDayScheduleActive");

      $duringDaySchedule = new Schedule(
        $mockedNow->clone()->subDay()->timestamp * 1000,
        $mockedNow->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
      );

      $isDuringDayScheduleActive = Scheduler::isScheduleActiveWithNow($duringDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertTrue($isDuringDayScheduleActive, "Hour $hour: isDuringScheduleActive");


      $afterDaySchedule = new Schedule(
        $mockedNow->clone()->subDay()->timestamp * 1000,
        $mockedNow->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->subHours(3)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
      );

      $isAfterDayScheduleActive = Scheduler::isScheduleActiveWithNow($afterDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isAfterDayScheduleActive, "Hour $hour: isAfterDayScheduleActive");


      $afterWholeSchedule = new Schedule(
        $mockedNow->clone()->subDays(3)->timestamp * 1000,
        $mockedNow->clone()->subDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->subHours(3)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
      );

      $isAfterWholeScheduleActive = Scheduler::isScheduleActiveWithNow($afterWholeSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isAfterWholeScheduleActive, "Hour $hour: isAfterWholeScheduleActive");
    }
  }

  public function testActiveDailyMultiDay()
  {
    $now = Carbon::now("UTC");
    $zeroDay = Carbon::createFromTimestampMsUTC(0);

    for ($hour = 0; $hour < 24; $hour++) {

      $mockedNow = Carbon::create(
        $now->year,
        $now->month,
        $now->day,
        $hour,
        0,
        0,
      );

      $zeroDayWithMockedTime = $zeroDay->clone();
      $zeroDayWithMockedTime->setHours($hour);

      $beforeWholeSchedule = new Schedule(
        $mockedNow->clone()->addDay()->timestamp * 1000,
        $mockedNow->clone()->addDays(3)->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHours(3)->timestamp * 1000,
      );

      $isBeforeWholeScheduleActive = Scheduler::isScheduleActiveWithNow($beforeWholeSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isBeforeWholeScheduleActive, "Hour $hour: isBeforeWholeScheduleActive");

      $beforeDaySchedule = new Schedule(
        $mockedNow->clone()->subDay()->timestamp * 1000,
        $mockedNow->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHours(3)->timestamp * 1000,
      );

      $isBeforeDayScheduleActive = Scheduler::isScheduleActiveWithNow($beforeDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isBeforeDayScheduleActive, "Hour $hour: isBeforeDayScheduleActive");

      $duringDaySchedule = new Schedule(
        $mockedNow->clone()->subDay()->timestamp * 1000,
        $mockedNow->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->addHour()->timestamp * 1000,
      );

      $isDuringDayScheduleActive = Scheduler::isScheduleActiveWithNow($duringDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertTrue($isDuringDayScheduleActive, "Hour $hour: isDuringScheduleActive");


      $afterDaySchedule = new Schedule(
        $mockedNow->clone()->subDay()->timestamp * 1000,
        $mockedNow->clone()->addDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->subHours(3)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
      );

      $isAfterDayScheduleActive = Scheduler::isScheduleActiveWithNow($afterDaySchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isAfterDayScheduleActive, "Hour $hour: isAfterDayScheduleActive");

      $afterWholeSchedule = new Schedule(
        $mockedNow->clone()->subDays(3)->timestamp * 1000,
        $mockedNow->clone()->subDay()->timestamp * 1000,
        'UTC',
        ScheduleTimeType::DAILY,
        $zeroDayWithMockedTime->clone()->subHours(3)->timestamp * 1000,
        $zeroDayWithMockedTime->clone()->subHour()->timestamp * 1000,
      );

      $isAfterWholeScheduleActive = Scheduler::isScheduleActiveWithNow($afterWholeSchedule, ScheduleType::GLOBAL , $mockedNow);

      $this->assertFalse($isAfterWholeScheduleActive, "Hour $hour: isAfterWholeScheduleActive");
    }
  }
}
