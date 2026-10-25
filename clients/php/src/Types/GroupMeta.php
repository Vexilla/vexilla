<?php

namespace Vexilla\Types;

class GroupMeta
{
    /** @var string */
    public $version;
    function __construct($version = '1.0')
    {
        \Vexilla\Validation::text($version);
        \Vexilla\Validation::tree($version);
        $this->version = $version;
    }
}
