<?php
declare(strict_types=1);

namespace Vexilla\Tests;

use PHPUnit\Framework\TestCase;
use Vexilla\Hasher;

final class HasherTest extends TestCase
{

    private $workingGradualSeed = 0.32;
    private $nonWorkingGradualSeed = 0.22;
    private $uuid = 'b7e91cc5-ec76-4ec3-9c1c-075032a13a1a';

    public function testWorkingGradualSeed()
    {
        $hashValue = Hasher::hashString($this->uuid, $this->workingGradualSeed);
        var_dump("working value: $hashValue");
        $this->assertTrue($hashValue <= 0.4);
        $this->assertEquals(0.19, $hashValue);
    }

    public function testNonWorkingGradualSeed()
    {
        $hashValue = Hasher::hashString($this->uuid, $this->nonWorkingGradualSeed);
        var_dump("NOT working value: $hashValue");
        $this->assertTrue($hashValue > 0.4);
        $this->assertEquals(0.943, $hashValue);
    }
}