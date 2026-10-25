<?php

namespace Vexilla\Types;

class Manifest
{
    /** @var string */
    public $version;
    public array $groups;
    function __construct($version, array $groups)
    {
        \Vexilla\Validation::check($version === 'v1', 'Manifest version must be v1');
        $this->version = $version;
        $this->groups = $groups;
    }
}
