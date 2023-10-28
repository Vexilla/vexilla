<?php

namespace Vexilla\Types;

class ManifestGroup {

    public string $name;
    public string $groupId;

    function __construct(string $name, string $groupId) {
        $this->name = $name;
        $this->groupId = $groupId;
    }

}