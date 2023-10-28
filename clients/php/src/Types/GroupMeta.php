<?php

namespace Vexilla\Types;

class GroupMeta
{
    public string $version;

    function __construct(string $version = '1.0') {
        $this->version = $version;
    }
}
