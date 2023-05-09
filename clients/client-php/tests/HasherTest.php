<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;
use Vexilla\Hasher;

final class HasherTest extends TestCase
{

    private $workingGradualSeed = 0.11;
    private $nonWorkingGradualSeed = 0.22;
    private $uuid = 'b7e91cc5-ec76-4ec3-9c1c-075032a13a1a';

    public function testWorkingGradualSeed()
    {
        $hasher = new Hasher($this->workingGradualSeed);
        $hashValue = $hasher->hashString($this->uuid);
        $this->assertTrue($hashValue <= 40);
    }

    public function testNonWorkingGradualSeed()
    {
        $hasher = new Hasher($this->nonWorkingGradualSeed);
        $hashValue = $hasher->hashString($this->uuid);
        $this->assertTrue($hashValue > 40);
    }
}