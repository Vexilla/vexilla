<?php

namespace Vexilla\Tests;

use PHPUnit\Framework\TestCase;
use Vexilla\{Client, ContractException};
final class LoggingTest extends TestCase
{
    public function testDiagnosticsAreOptInAndPreserveFailures() : void
    {
        $diagnosticFile = tempnam(sys_get_temp_dir(), 'vexilla-logging-');
        $originalErrorLog = ini_get('error_log');
        ini_set('error_log', $diagnosticFile);
        try {
            foreach ([false, true] as $showLogs) {
                file_put_contents($diagnosticFile, '');
                $client = new Client('https://private-token@contract', 'prod', 'private-instance', $showLogs);
                $manifest = $client->getManifest(function () {
                    return '{"version":"v1","groups":[]}';
                });
                $client->setManifest($manifest);
                try {
                    $client->getManifest(function () {
                        throw new \RuntimeException('private-callback-error');
                    });
                    $this->fail('Fetch failure was swallowed');
                } catch (ContractException $error) {
                    $this->assertSame('fetch', $error->kind);
                }
                $manifest->version = 'invalid';
                try {
                    $client->setManifest($manifest);
                    $this->fail('Validation failure was swallowed');
                } catch (ContractException $error) {
                    $this->assertSame('validation', $error->kind);
                }
                $diagnostics = file_get_contents($diagnosticFile);
                if (!$showLogs) {
                    $this->assertSame('', $diagnostics);
                    continue;
                }
                foreach (['manifest.fetch outcome=success', 'manifest.install outcome=success', 'manifest.fetch outcome=failure', 'manifest.install outcome=failure'] as $expected) {
                    $this->assertStringContainsString($expected, $diagnostics);
                }
                $this->assertStringNotContainsString('private-', $diagnostics);
            }
        } finally {
            ini_set('error_log', $originalErrorLog);
            unlink($diagnosticFile);
        }
    }
}
