<?php

namespace Vexilla\Types;

class RealIds {
    public string $groupId;
    public string $environmentId;
    public string $featureId;

    function __construct(string $groupId, string $environmentId, string $featureId) {
        $this->groupId = $groupId;
        $this->environmentId = $environmentId;
        $this->featureId = $featureId;
    }
}
