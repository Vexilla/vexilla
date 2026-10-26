import { defaultSchedule } from "@vexilla/publishing";
import { TextInput, Switch, Alert, Button } from "@mantine/core";
import type { VexillaFeature, VexillaSchedule } from "@vexilla/publishing";
import { SelectiveList } from "./SelectiveList";
import { ScheduledForm } from "./ScheduledForm";

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
}: {
  feature: VexillaFeature;
  expectedFeatureId?: string;
  onScheduleChange?: (schedule: VexillaSchedule) => void;
}) {
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
}
