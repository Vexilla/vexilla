import {
  Box,
  Button,
  Select,
  Radio,
  Group,
  TextInput,
  Text,
} from "@mantine/core";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSnapshot } from "valtio";
import { changeFeatureType, FeatureShape } from "@vexilla/publishing";
import type { VexillaScheduleType } from "@vexilla/types";
import { config } from "../../stores/config-valtio";
import { PageLayout } from "../../components/PageLayout";
import { FeatureFields } from "../../components/features/FeatureFields";

function decodeSection(hash: string) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return undefined;
  }
}

export function EditFeature() {
  const params = useParams();
  const location = useLocation();
  const sectionId = decodeSection(location.hash);
  const scheduleRepairSection =
    new URLSearchParams(location.search).get("repair") === "schedule"
      ? sectionId
      : undefined;
  useEffect(() => {
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView();
    }
  }, [sectionId, location.search, location.pathname]);
  useSnapshot(config);
  const navigate = useNavigate();
  const group = config.groups.find((g) => g.groupId === params.groupId);
  const featureId = params.featureId || "";
  const feature = group?.features[featureId];
  if (!group || !feature) {
    return (
      <PageLayout>
        <h2>Feature not found</h2>
      </PageLayout>
    );
  }
  const environmentEntries = Object.entries(group.environments);
  const environments = environmentEntries.map(([, env]) => env);
  const shape = feature as FeatureShape;
  const change = (next: FeatureShape) =>
    changeFeatureType(group, featureId, next);
  return (
    <PageLayout>
      <Box>
        <Button
          variant="light"
          onClick={() => navigate(`/groups/${group.groupId}`)}
        >
          Back to {group.name}
        </Button>
      </Box>
      <h2>Edit Feature</h2>
      <TextInput
        label="Name"
        value={feature.name}
        onChange={(e) => {
          feature.name = e.currentTarget.value;
          environments.forEach((env) => {
            if (env.features[featureId]) {
              env.features[featureId].name = feature.name;
            }
          });
        }}
      />
      <Select
        label="Feature Type"
        value={feature.featureType}
        data={["toggle", "gradual", "selective", "value"]}
        onChange={(value) => {
          if (value) {
            change({ featureType: value as FeatureShape["featureType"] });
          }
        }}
      />
      {(feature.featureType === "selective" ||
        feature.featureType === "value") && (
        <>
          <Radio.Group
            label="Value Type"
            value={shape.valueType}
            onChange={(value) =>
              change({
                featureType: feature.featureType,
                valueType: value as "string" | "number",
                ...(value === "number" ? { numberType: "int" } : {}),
              })
            }
          >
            <Group my="sm">
              <Radio value="string" label="String" />
              <Radio value="number" label="Number" />
            </Group>
          </Radio.Group>
          {shape.valueType === "number" && (
            <Radio.Group
              label="Number Type"
              value={shape.numberType}
              onChange={(value) =>
                change({ ...shape, numberType: value as "int" | "float" })
              }
            >
              <Group my="sm">
                <Radio value="int" label="Integer" />
                <Radio value="float" label="Float" />
              </Group>
            </Radio.Group>
          )}
        </>
      )}
      <Radio.Group
        label="Schedule Type"
        value={feature.scheduleType}
        onChange={(value) => {
          feature.scheduleType = value as VexillaScheduleType;
          environments.forEach((env) => {
            if (env.features[featureId]) {
              env.features[featureId].scheduleType =
                value as VexillaScheduleType;
            }
          });
        }}
      >
        <Group my="sm">
          <Radio value="" label="None" />
          <Radio value="global" label="Global" />
          <Radio value="environment" label="Per Environment" />
        </Group>
      </Radio.Group>
      <section id="group-defaults">
        <h3>Group defaults</h3>
        <Text mb="sm">
          Complete default values are included in the group JSON. Global
          schedules apply to every environment.
        </Text>
        <FeatureFields
          key={`${featureId}-${feature.featureType}-${shape.valueType}-${shape.numberType}`}
          feature={feature}
          expectedFeatureId={featureId}
          scheduleType={feature.scheduleType}
          scheduleScope="group"
          repairSchedule={scheduleRepairSection === "group-defaults"}
          onScheduleChange={(schedule) => {
            if (feature.scheduleType === "global") {
              environments.forEach((env) => {
                const f = env.features[featureId];
                if (f) {
                  f.schedule = { ...schedule };
                }
              });
            }
          }}
        />
      </section>
      {environmentEntries.map(([environmentId, env]) => (
        <section key={environmentId} id={`environment-${environmentId}`}>
          <h3>{env.name}</h3>
          {env.environmentId !== environmentId && (
            <Button
              mb="sm"
              onClick={() => {
                env.environmentId = environmentId;
              }}
            >
              Use environment ID {environmentId}
            </Button>
          )}
          {env.features[featureId] ? (
            <FeatureFields
              feature={env.features[featureId]}
              expectedFeatureId={featureId}
              scheduleType={feature.scheduleType}
              scheduleScope="environment"
              repairSchedule={
                scheduleRepairSection === `environment-${environmentId}`
              }
            />
          ) : (
            <Text c="red">
              Missing feature. Choose its type above to explicitly initialize
              complete defaults.
            </Text>
          )}
        </section>
      ))}
    </PageLayout>
  );
}
