import React from "react";
import { Timeline, Text } from "@mantine/core";

import { PageLayout } from "../components/PageLayout";

// First, enter your hosting configuration. (S3, Azure, GCP, etc.)
// Next, start creating your environments. (dev, staging, prod, etc.)
// Then, create your feature flags.

export function Home() {
  return (
    <PageLayout className="pt-16">
      <Timeline active={2} bulletSize={24} lineWidth={2}>
        <Timeline.Item
          bullet={1}
          title="First, enter your hosting configuration"
        >
          <Text color="dimmed" size="sm">
            (S3, Azure, GCP, etc.)
          </Text>
        </Timeline.Item>

        <Timeline.Item
          bullet={2}
          title="Next, start creating your environments."
        >
          <Text color="dimmed" size="sm">
            (dev, staging, prod, etc.)
          </Text>
        </Timeline.Item>

        <Timeline.Item bullet={3} title="Then, create your feature flags.">
          <Text color="dimmed" size="sm">
            (Toggle, Gradual, Scheduled, etc.)
          </Text>
        </Timeline.Item>
      </Timeline>
    </PageLayout>
  );
}
