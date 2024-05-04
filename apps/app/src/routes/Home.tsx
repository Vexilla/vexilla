import _React from "react";
import { Timeline, Text } from "@mantine/core";

import { PageLayout } from "../components/PageLayout";

export function Home() {
  return (
    <PageLayout className="pt-16">
      <Timeline active={2} bulletSize={24} lineWidth={2}>
        <Timeline.Item
          bullet={1}
          title="First, enter your hosting configuration"
        >
          <Text c="dimmed" size="sm">
            (S3, Azure, GCP, etc.)
          </Text>
        </Timeline.Item>

        <Timeline.Item
          bullet={2}
          title="Next, start creating your environments."
        >
          <Text c="dimmed" size="sm">
            (dev, staging, prod, etc.)
          </Text>
        </Timeline.Item>

        <Timeline.Item bullet={3} title="Then, create your feature flags.">
          <Text c="dimmed" size="sm">
            (Toggle, Gradual, Selective, etc.)
          </Text>
        </Timeline.Item>
      </Timeline>
    </PageLayout>
  );
}
