<?php

namespace Vexilla;

class ContractException extends \InvalidArgumentException
{
    public string $kind;
    public function __construct(string $kind, string $message)
    {
        parent::__construct($message);
        $this->kind = $kind;
    }
}
