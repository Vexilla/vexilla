declare namespace Intl {
  type Key =
    | "calendar"
    | "collation"
    | "currency"
    | "numberingSystem"
    | "timeZone"
    | "unit";

  function supportedValuesOf(input: Key): string[];
}

import React, { useRef } from "react";
import {
  Flex,
  Box,
  ActionIcon,
  Select,
  Radio,
  Group,
  SegmentedControl,
  Input,
} from "@mantine/core";
import { DatePicker, TimeInput } from "@mantine/dates";
import Case from "case";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { VexillaSchedule } from "@vexilla/types";

import { Icon } from "@iconify/react";
import clockCircleBroken from "@iconify/icons-solar/clock-circle-broken";

const timezones = Intl.supportedValuesOf("timeZone");
timezones.unshift("UTC");

interface ScheduledFormProps {
  featureSchedule: VexillaSchedule;
  onChange: (newFeature: VexillaSchedule) => void | Promise<void>;
}

export function ScheduledForm({
  featureSchedule,
  onChange,
}: ScheduledFormProps) {
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  let datePickerValue: [Date | null, Date | null] | undefined = undefined;

  if (featureSchedule.start && featureSchedule.end) {
    datePickerValue = [
      new Date(featureSchedule.start),
      new Date(featureSchedule.end),
    ];
  } else if (featureSchedule.start) {
    datePickerValue = [new Date(featureSchedule.start), null];
  } else if (featureSchedule.end) {
    datePickerValue = [null, new Date(featureSchedule.end)];
  }

  return (
    <Flex direction="row" gap="1rem">
      <Box w="50%">
        <DatePicker
          type="range"
          allowSingleDateInRange
          value={datePickerValue}
          onChange={(event) => {
            const [newStartDate, newEndDate] = event;
            onChange({
              ...featureSchedule,
              start: newStartDate?.getTime() || null,
              end: newEndDate?.getTime() || null,
            });
          }}
        />
      </Box>
      <Box w="50% ">
        <Select
          label="Timezone"
          data={timezones}
          value={featureSchedule.timezone || "UTC"}
        />
        <Input.Label className="block mt-2">Specific times</Input.Label>
        <SegmentedControl
          className="mb-1"
          fullWidth
          value={featureSchedule.timeType}
          data={["none", "start/end", "daily"].map((value) => ({
            label: Case.capital(value).replace(" ", "/"),
            value,
          }))}
          onChange={(event: "none" | "start/end" | "daily") => {
            onChange({
              ...featureSchedule,
              timeType: event,
            });
          }}
        />
        {featureSchedule.timeType && featureSchedule.timeType !== "none" && (
          <>
            <TimeInput
              label="Start Time"
              ref={startTimeRef}
              value={
                dayjs.utc(featureSchedule.startTime).format("HH:mm") || "00:00"
              }
              rightSection={
                <ActionIcon onClick={() => startTimeRef?.current?.showPicker()}>
                  <Icon icon={clockCircleBroken} />
                </ActionIcon>
              }
              maw={400}
              mx="auto"
              onChange={(event) => {
                const [hours, minutes] = event.target.value.split(
                  ":"
                ) as unknown as number[];

                let newStartTime = dayjs.utc(0);
                newStartTime = newStartTime.set("hours", hours);
                newStartTime = newStartTime.set("minutes", minutes);

                onChange({
                  ...featureSchedule,
                  startTime: newStartTime.unix() * 1000,
                });
              }}
            />

            <TimeInput
              label="End Time"
              ref={endTimeRef}
              value={
                dayjs.utc(featureSchedule.endTime).format("HH:mm") || "00:00"
              }
              rightSection={
                <ActionIcon onClick={() => endTimeRef?.current?.showPicker()}>
                  <Icon icon={clockCircleBroken} />
                </ActionIcon>
              }
              maw={400}
              mx="auto"
              onChange={(event) => {
                const [hours, minutes] = event.target.value.split(
                  ":"
                ) as unknown as number[];

                let newEndTime = dayjs.utc(0);
                newEndTime = newEndTime.set("hours", hours);
                newEndTime = newEndTime.set("minutes", minutes);

                onChange({
                  ...featureSchedule,
                  endTime: newEndTime.unix() * 1000,
                });
              }}
            />
          </>
        )}
      </Box>
    </Flex>
  );
}
