<?php

namespace Vexilla;

use Vexilla\Types\{Manifest, Group, Feature, ToggleFeature, GradualFeature, SelectiveFeature, ValueFeature, ValueStringFeature, ValueIntFeature, ValueFloatFeature};
class Client
{
    private string $baseUrl;
    private string $environment;
    private bool $showLogs;
    private $customInstanceHash;
    private ?Manifest $manifest = null;
    private array $groups = [];
    private array $groupLookupTable = [];
    private array $environmentLookupTable = [];
    private array $featureLookupTable = [];
    public function __construct(string $baseUrl, string $environment, $customInstanceHash = null, bool $showLogs = false)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->environment = $environment;
        $this->showLogs = $showLogs;
        $this->customInstanceHash = $customInstanceHash;
    }
    private function diagnoseOperation(string $operationName, callable $operation)
    {
        try {
            $result = $operation();
        } catch (\Throwable $error) {
            $this->reportOperation($operationName, false);
            throw $error;
        }
        $this->reportOperation($operationName, true);
        return $result;
    }
    private function reportOperation(string $operationName, bool $succeeded) : void
    {
        if ($this->showLogs) {
            $outcome = $succeeded ? 'success' : 'failure';
            error_log('vexilla operation=' . $operationName . ' outcome=' . $outcome);
        }
    }
    private function request(string $path, callable $callback)
    {
        try {
            return $callback($this->baseUrl . '/' . $path);
        } catch (\Throwable $error) {
            throw new ContractException('fetch', 'Fetch failed: ' . $error->getMessage());
        }
    }
    public function getManifest(callable $callback) : Manifest
    {
        return $this->diagnoseOperation('manifest.fetch', function () use($callback) {
            return Codec::manifest($this->request('manifest.json', $callback));
        });
    }
    public function setManifest(Manifest $manifest) : void
    {
        $this->diagnoseOperation('manifest.install', function () use($manifest) {
            Validation::tree($manifest);
            $manifestSnapshot = Codec::manifest(Codec::wire($manifest));
            $groupAliases = [];
            $survivingGroups = [];
            foreach ($manifestSnapshot->groups as $manifestGroup) {
                Validation::alias($groupAliases, $manifestGroup->groupId, $manifestGroup->name);
                if (isset($this->groups[$manifestGroup->groupId]) && $this->groups[$manifestGroup->groupId]->name === $manifestGroup->name) {
                    $survivingGroups[$manifestGroup->groupId] = $this->groups[$manifestGroup->groupId];
                }
            }
            $this->manifest = $manifestSnapshot;
            $this->groupLookupTable = $groupAliases;
            $this->groups = $survivingGroups;
            $this->environmentLookupTable = array_intersect_key($this->environmentLookupTable, $survivingGroups);
            $this->featureLookupTable = array_intersect_key($this->featureLookupTable, $survivingGroups);
        });
    }
    public function syncManifest(callable $callback) : void
    {
        $this->setManifest($this->getManifest($callback));
    }
    private function groupId(string $name) : string
    {
        if (!array_key_exists($name, $this->groupLookupTable)) {
            throw new ContractException('lookup', 'Group not found: ' . $name);
        }
        return $this->groupLookupTable[$name];
    }
    private function match(Group $group) : void
    {
        if ($this->manifest === null) {
            throw new ContractException('lookup', 'Manifest not installed');
        }
        foreach ($this->manifest->groups as $manifestGroup) {
            if ($manifestGroup->groupId === $group->groupId && $manifestGroup->name === $group->name) {
                return;
            }
        }
        throw new ContractException('validation', 'Group ID/name differs from manifest');
    }
    public function getFlags(string $groupNameOrId, callable $callback) : Group
    {
        return $this->diagnoseOperation('group.fetch', function () use($groupNameOrId, $callback) {
            $groupId = $this->groupId($groupNameOrId);
            $fetchedGroup = Codec::group($this->request($groupId . '.json', $callback));
            $this->match($fetchedGroup);
            Validation::check($fetchedGroup->groupId === $groupId, 'Fetched group differs from requested group');
            return $fetchedGroup;
        });
    }
    public function setFlags(Group $flagGroup) : void
    {
        $this->diagnoseOperation('group.install', function () use($flagGroup) {
            Validation::tree($flagGroup);
            $groupSnapshot = Codec::group(Codec::wire($flagGroup));
            $this->match($groupSnapshot);
            $environmentAliases = [];
            $featureAliases = [];
            foreach ($groupSnapshot->environments as $environmentId => $environment) {
                Validation::alias($environmentAliases, (string) $environmentId, $environment->name);
            }
            foreach ($groupSnapshot->features as $featureId => $feature) {
                Validation::alias($featureAliases, (string) $featureId, $feature->name);
            }
            $groupId = $groupSnapshot->groupId;
            $this->groups[$groupId] = $groupSnapshot;
            $this->environmentLookupTable[$groupId] = $environmentAliases;
            $this->featureLookupTable[$groupId] = $featureAliases;
        });
    }
    public function syncFlags(string $groupNameOrId, callable $callback) : void
    {
        $this->setFlags($this->getFlags($groupNameOrId, $callback));
    }
    private function feature(string $groupNameOrId, string $featureNameOrId) : Feature
    {
        $groupId = $this->groupId($groupNameOrId);
        $installedGroup = $this->groups[$groupId] ?? null;
        $environmentId = $this->environmentLookupTable[$groupId][$this->environment] ?? null;
        $featureId = $this->featureLookupTable[$groupId][$featureNameOrId] ?? null;
        if ($installedGroup === null || $environmentId === null || $featureId === null) {
            throw new ContractException('lookup', 'Group, environment or feature not installed');
        }
        return $installedGroup->environments[$environmentId]->features[$featureId];
    }
    public function should(string $groupNameOrId, string $featureNameOrId) : bool
    {
        return $this->shouldCustom($groupNameOrId, $featureNameOrId, $this->customInstanceHash);
    }
    public function shouldCustomString(string $groupNameOrId, string $featureNameOrId, $customInstanceId) : bool
    {
        return $this->shouldCustom($groupNameOrId, $featureNameOrId, $customInstanceId);
    }
    public function shouldCustomInt(string $groupNameOrId, string $featureNameOrId, $customInstanceId) : bool
    {
        return $this->shouldCustom($groupNameOrId, $featureNameOrId, $customInstanceId);
    }
    public function shouldCustomFloat(string $groupNameOrId, string $featureNameOrId, $customInstanceId) : bool
    {
        return $this->shouldCustom($groupNameOrId, $featureNameOrId, $customInstanceId);
    }
    public function shouldCustom(string $groupNameOrId, string $featureNameOrId, $customInstanceId) : bool
    {
        $feature = $this->feature($groupNameOrId, $featureNameOrId);
        if ($feature instanceof ValueFeature) {
            throw new ContractException('kind', 'Value feature requires a value operation');
        }
        if ($feature instanceof ToggleFeature) {
            return Scheduler::isScheduledFeatureActive($feature) && $feature->value;
        }
        Hasher::validateInstance($customInstanceId);
        if (!Scheduler::isScheduledFeatureActive($feature)) {
            return false;
        }
        if ($feature instanceof GradualFeature) {
            return Hasher::hashString(Hasher::instanceText($customInstanceId), $feature->seed) < $feature->value;
        }
        if ($feature instanceof SelectiveFeature) {
            if ($feature->valueType === 'string') {
                return is_string($customInstanceId) && in_array($customInstanceId, $feature->value, true);
            }
            if (!is_int($customInstanceId) && !is_float($customInstanceId)) {
                return false;
            }
            foreach ($feature->value as $v) {
                if ((float) $v === (float) $customInstanceId) {
                    return true;
                }
            }
            return false;
        }
        throw new ContractException('kind', 'Unsupported boolean feature');
    }
    public function value(string $groupNameOrId, string $featureNameOrId, $default)
    {
        $feature = $this->feature($groupNameOrId, $featureNameOrId);
        if (!$feature instanceof ValueFeature) {
            throw new ContractException('kind', 'Expected value feature');
        }
        return Scheduler::isScheduledFeatureActive($feature) ? $feature->value : $default;
    }
    private function typedValue(string $group, string $name, $default, string $class)
    {
        $feature = $this->feature($group, $name);
        if (!$feature instanceof $class) {
            throw new ContractException('kind', 'Value subtype differs');
        }
        return Scheduler::isScheduledFeatureActive($feature) ? $feature->value : $default;
    }
    public function valueString(string $groupNameOrId, string $featureNameOrId, string $default) : string
    {
        return $this->typedValue($groupNameOrId, $featureNameOrId, $default, ValueStringFeature::class);
    }
    public function valueInt(string $groupNameOrId, string $featureNameOrId, int $default) : int
    {
        return $this->typedValue($groupNameOrId, $featureNameOrId, $default, ValueIntFeature::class);
    }
    public function valueFloat(string $groupNameOrId, string $featureNameOrId, float $default) : float
    {
        return $this->typedValue($groupNameOrId, $featureNameOrId, $default, ValueFloatFeature::class);
    }
}
