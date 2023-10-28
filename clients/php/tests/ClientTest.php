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
            'http://192.168.1.6:3000',
            'dev',
            $this->uuid,
            true
        );

        $client->syncManifest(function($url) {
          $response = file_get_contents($url);
          return json_decode($response);
        });

        $client->syncFlags('Gradual', function($url) {
          $response = file_get_contents($url);
          return json_decode($response);
        });

        $this->assertTrue($client->should("Gradual", "testingWorkingGradual"));
        $this->assertFalse($client->should("Gradual", "testingNonWorkingGradual"));

    }
}