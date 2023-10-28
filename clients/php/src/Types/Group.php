<?php

namespace Vexilla\Types;

class Group {
    public string $name;
    public string $groupId;
    public GroupMeta $meta;
    public array $environments;
    public array $features;


    function __construct(string $name, string $groupId, GroupMeta $meta, array $environments, array $features) {
        $this->name = $name;
        $this->groupId = $groupId;
        $this->meta = $meta;
        $this->environments = $environments;
        $this->features = $features;
    }

    function getEnvironment(string $environmentId): ?Environment {
        $environment = $this->environments[$environmentId];
        if ($environment) {
            return $environment;
        } else {
            return null;
        }
    }

    function getFeature(string $featureId): ?Feature {
        $feature = $this->features[$featureId];
        if ($feature) {
            return $feature;
        } else {
            return null;
        }
    }
}