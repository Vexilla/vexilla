import { defaultSchedule } from "@vexilla/publishing";
import { TextInput, Switch, Alert, Button } from "@mantine/core";
import type { VexillaFeature, VexillaSchedule } from "@vexilla/publishing";
import type { VexillaScheduleType } from "@vexilla/types";
import { useState, type ReactNode } from "react";
import { SelectiveList } from "./SelectiveList";
import { ScheduledForm } from "./ScheduledForm";

function SavedSchedule({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <details
      className="mt-4"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>Edit saved schedule</summary>
      {expanded && children}
    </details>
  );
}

function NumericInput({
  feature,
  field,
  label,
}: {
  feature: VexillaFeature;
  field: "seed" | "value";
  label: string;
}) {
  return (
    <TextInput
      label={label}
      inputMode="decimal"
      value={(feature as any)[field] ?? ""}
      onChange={(e) => {
        (feature as any)[field] = e.currentTarget.value;
      }}
      description={
        field === "seed"
          ? "Enter a seed greater than 0 and at most 1. Changing it changes rollout membership."
          : undefined
      }
    />
  );
}

export function FeatureFields({
  feature,
  onScheduleChange,
  expectedFeatureId,
  scheduleType,
  scheduleScope,
}: {
  feature: VexillaFeature;
  expectedFeatureId?: string;
  onScheduleChange?: (schedule: VexillaSchedule) => void;
  scheduleType: VexillaScheduleType;
  scheduleScope: "group" | "environment";
}) {
  const scheduleIsActive =
    (scheduleType === "global" && scheduleScope === "group") ||
    (scheduleType === "environment" && scheduleScope === "environment");
  const scheduleEditor = (
    <>
      <h5>Schedule dates and times</h5>
      <ScheduledForm
        featureSchedule={feature.schedule || defaultSchedule()}
        onChange={(schedule) => {
          feature.schedule = schedule;
          onScheduleChange?.(schedule);
        }}
      />
    </>
  );
  return (
    <>
      {expectedFeatureId && feature.featureId !== expectedFeatureId && (
        <Alert title="Repair feature identity" mb="sm">
          This object must use the feature map ID {expectedFeatureId}.
          <Button
            display="block"
            mt="xs"
            onClick={() => {
              feature.featureId = expectedFeatureId;
            }}
          >
            Use feature ID {expectedFeatureId}
          </Button>
        </Alert>
      )}
      {feature.featureType === "toggle" && (
        <Switch
          label="Enabled"
          checked={feature.value === true}
          onChange={(e) => {
            feature.value = e.currentTarget.checked;
          }}
        />
      )}
      {feature.featureType === "gradual" && (
        <>
          <NumericInput field="seed" label="Seed" feature={feature} />
          <NumericInput field="value" label="Threshold" feature={feature} />
        </>
      )}
      {feature.featureType === "selective" && (
        <SelectiveList
          valueType={feature.valueType}
          items={Array.isArray(feature.value) ? feature.value : []}
          onListChange={(items) => {
            feature.value = items as any;
          }}
        />
      )}
      {feature.featureType === "value" &&
        (feature.valueType === "number" ? (
          <NumericInput field="value" label="Value" feature={feature} />
        ) : (
          <TextInput
            label="Value"
            value={feature.value ?? ""}
            onChange={(e) => {
              feature.value = e.currentTarget.value;
            }}
          />
        ))}
      {scheduleIsActive ? (
        scheduleEditor
      ) : (
        <SavedSchedule key={`${feature.featureId}-${scheduleType}`}>
          {scheduleEditor}
        </SavedSchedule>
      )}
    </>
  );
}
