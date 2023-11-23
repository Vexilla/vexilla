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
      'http://127.0.0.1:3000',
      'dev',
      $this->uuid,
      true
    );

    $client->syncManifest(function ($url) {
      $response = file_get_contents($url);
      return json_decode($response);
    });

    $client->syncFlags('Gradual', function ($url) {
      $response = file_get_contents($url);
      return json_decode($response);
    });

    $this->assertTrue($client->should("Gradual", "testingWorkingGradual"));
    $this->assertFalse($client->should("Gradual", "testingNonWorkingGradual"));

    $client->syncFlags('Selective', function ($url) {
      $response = file_get_contents($url);
      return json_decode($response);
    });

    $this->assertTrue($client->should("Selective", "String"));
    $this->assertTrue($client->shouldCustomString("Selective", "String", "shouldBeInList"));
    $this->assertTrue($client->shouldCustomInt("Selective", "Number", 42));

    $client->syncFlags('Value', function ($url) {
      $response = file_get_contents($url);
      return json_decode($response);
    });

    $this->assertEquals("foo", $client->valueString('Value', 'String', ""));
    $this->assertEquals(42, $client->valueInt('Value', 'Integer', 0));
    $this->assertEquals(42.42, $client->valueFloat('Value', 'Float', 0.0));

    $client->syncFlags('Scheduled', function ($url) {
      $response = file_get_contents($url);
      return json_decode($response);
    });

    $this->assertFalse($client->should('Scheduled', 'beforeGlobal'));
    $this->assertTrue($client->should('Scheduled', 'duringGlobal'));
    $this->assertFalse($client->should('Scheduled', 'afterGlobal'));

    $this->assertFalse($client->should('Scheduled', 'beforeGlobalStartEnd'));
    $this->assertTrue($client->should('Scheduled', 'duringGlobalStartEnd'));
    $this->assertFalse($client->should('Scheduled', 'afterGlobalStartEnd'));

    $this->assertFalse($client->should('Scheduled', 'beforeGlobalDaily'));
    $this->assertTrue($client->should('Scheduled', 'duringGlobalDaily'));
    $this->assertFalse($client->should('Scheduled', 'afterGlobalDaily'));

  }
}