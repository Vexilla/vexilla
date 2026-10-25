<?php

namespace Vexilla\Types;

class ManifestGroup
{
    /** @var string */
    public $name;
    /** @var string */
    public $groupId;
    function __construct($name, $groupId)
    {
        \Vexilla\Validation::text($name);
        \Vexilla\Validation::text($groupId, true);
        \Vexilla\Validation::tree([$name, $groupId]);
        $this->name = $name;
        $this->groupId = $groupId;
    }
}
