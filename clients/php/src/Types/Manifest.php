<?php

namespace Vexilla\Types;

class Manifest {
    public string $version;
    public array $groups;

    function __construct(string $version, array $groups) {
        $this->version = $version;
        $this->groups = $groups;
    }
}
