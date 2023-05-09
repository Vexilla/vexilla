<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;
use Vexilla\Client;

final class ClientTest extends TestCase
{
    private $uuid = 'b7e91cc5-ec76-4ec3-9c1c-075032a13a1a';

    public function testClient()
    {
        $client = new Client(
            'https://streamparrot-feature-flags.s3.amazonaws.com',
            'dev',
            $this->uuid
        );

        $client = $client->getFlags('features');

        $this->assertTrue($client->should("testingWorkingGradual"));
        $this->assertFalse($client->should("testingNonWorkingGradual"));

    }
}