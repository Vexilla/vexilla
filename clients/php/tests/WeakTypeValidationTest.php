<?php

// Deliberately use PHP's default weak typing to exercise public model boundaries.
namespace Vexilla\Tests;

use PHPUnit\Framework\TestCase;
use Vexilla\{Client, Codec, ContractException};
use Vexilla\Types\{Schedule, GradualFeature, ToggleFeature, ValueIntFeature};
final class WeakTypeValidationTest extends TestCase
{
    private function nativeFixture() : array
    {
        $schedule = (object) ['start' => 0, 'end' => 0, 'timezone' => 'UTC', 'timeType' => 'none', 'startTime' => 0, 'endTime' => 0];
        $features = (object) [];
        foreach (['toggle' => ['featureType' => 'toggle', 'value' => true], 'gradual' => ['featureType' => 'gradual', 'value' => 0.5, 'seed' => 1], 'value-int' => ['featureType' => 'value', 'value' => 42, 'valueType' => 'number', 'numberType' => 'int']] as $id => $fields) {
            $features->{$id} = (object) array_merge(['name' => $id, 'featureId' => $id, 'scheduleType' => '', 'schedule' => $schedule], $fields);
        }
        $raw = (object) ['name' => 'Flags', 'groupId' => 'contract-group', 'meta' => (object) ['version' => 'v1'], 'features' => $features, 'environments' => (object) ['prod' => (object) ['name' => 'prod', 'environmentId' => 'prod', 'features' => json_decode(json_encode($features))]]];
        $client = new Client('https://contract', 'prod', 'member');
        $client->setManifest(Codec::manifest((object) ['version' => 'v1', 'groups' => [(object) ['name' => 'Flags', 'groupId' => 'contract-group']]]));
        return [$client, Codec::group($raw)];
    }
    public function testConstructorsDoNotCoerceScalars()
    {
        $factories = [function () {
            return new Schedule(true);
        }, function () {
            return new Schedule('42');
        }, function () {
            return new GradualFeature('name', 'id', 'gradual', '', new Schedule(), 0.5, true);
        }, function () {
            return new GradualFeature('name', 'id', 'gradual', '', new Schedule(), '0.5', 0.5);
        }, function () {
            return new ToggleFeature('name', 'id', 'toggle', '', new Schedule(), 1);
        }, function () {
            return new ValueIntFeature('name', 'id', 'value', '', new Schedule(), 'number', true, 'int');
        }, function () {
            return new ValueIntFeature(false, 'id', 'value', '', new Schedule(), 'number', 1, 'int');
        }];
        foreach ($factories as $factory) {
            try {
                $factory();
                $this->fail('Weak constructor coercion accepted');
            } catch (ContractException $error) {
                $this->assertSame('validation', $error->kind);
            }
        }
    }
    public function testNativePropertyMutationIsValidatedWithoutCoercion()
    {
        [$client, $group] = $this->nativeFixture();
        $client->setFlags($group);
        $group->environments['prod']->features['value-int']->value = '42';
        try {
            $client->setFlags($group);
            $this->fail('Property mutation was coerced');
        } catch (ContractException $error) {
            $this->assertSame('validation', $error->kind);
        }
        $this->assertSame(42, $client->valueInt('contract-group', 'value-int', -1));
        foreach (['shouldCustomString', 'shouldCustomInt', 'shouldCustomFloat'] as $method) {
            try {
                $client->{$method}('contract-group', 'gradual', true);
                $this->fail('Instance ID was coerced');
            } catch (ContractException $error) {
                $this->assertSame('instance', $error->kind);
            }
        }
    }
    public function testNativeExtrasAreValidatedBeforeProjection()
    {
        foreach (['value', 'key', 'subtype', 'missing'] as $case) {
            [$client, $group] = $this->nativeFixture();
            if ($case === 'value') {
                $group->extra = "\xed\xa0\x80";
            } elseif ($case === 'key') {
                $key = "\xed\xa0\x80";
                $group->{$key} = true;
            } elseif ($case === 'missing') {
                unset($group->environments['prod']->features['toggle']->schedule);
            } else {
                $group->features['toggle']->valueType = false;
                foreach ($group->environments as $env) {
                    $env->features['toggle']->valueType = false;
                }
                $group->environments['prod']->features['toggle']->valueType = 0;
            }
            try {
                $client->setFlags($group);
                $this->fail('Invalid native extra was discarded');
            } catch (ContractException $error) {
                $this->assertSame('validation', $error->kind);
            }
        }
    }
}
