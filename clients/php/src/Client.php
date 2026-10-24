<?php

namespace Vexilla;

use Vexilla\Types\{Manifest, Group, Feature, ToggleFeature, GradualFeature, SelectiveFeature, ValueFeature, ValueStringFeature, ValueIntFeature, ValueFloatFeature};
class Client
{
    private string $baseUrl;
    private string $environment;
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
        $this->customInstanceHash = $customInstanceHash;
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
        return Codec::manifest($this->request('manifest.json', $callback));
    }
    public function setManifest(Manifest $manifest) : void
    {
        Validation::tree($manifest);
        $snapshot = Codec::manifest(Codec::wire($manifest));
        $aliases = [];
        $surviving = [];
        foreach ($snapshot->groups as $g) {
            Validation::alias($aliases, $g->groupId, $g->name);
            if (isset($this->groups[$g->groupId]) && $this->groups[$g->groupId]->name === $g->name) {
                $surviving[$g->groupId] = $this->groups[$g->groupId];
            }
        }
        $this->manifest = $snapshot;
        $this->groupLookupTable = $aliases;
        $this->groups = $surviving;
        $this->environmentLookupTable = array_intersect_key($this->environmentLookupTable, $surviving);
        $this->featureLookupTable = array_intersect_key($this->featureLookupTable, $surviving);
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
        foreach ($this->manifest->groups as $g) {
            if ($g->groupId === $group->groupId && $g->name === $group->name) {
                return;
            }
        }
        throw new ContractException('validation', 'Group ID/name differs from manifest');
    }
    public function getFlags(string $groupNameOrId, callable $callback) : Group
    {
        $id = $this->groupId($groupNameOrId);
        $g = Codec::group($this->request($id . '.json', $callback));
        $this->match($g);
        Validation::check($g->groupId === $id, 'Fetched group differs from requested group');
        return $g;
    }
    public function setFlags(Group $flagGroup) : void
    {
        Validation::tree($flagGroup);
        $snapshot = Codec::group(Codec::wire($flagGroup));
        $this->match($snapshot);
        $envs = [];
        $features = [];
        foreach ($snapshot->environments as $id => $e) {
            Validation::alias($envs, (string) $id, $e->name);
        }
        foreach ($snapshot->features as $id => $f) {
            Validation::alias($features, (string) $id, $f->name);
        }
        $id = $snapshot->groupId;
        $this->groups[$id] = $snapshot;
        $this->environmentLookupTable[$id] = $envs;
        $this->featureLookupTable[$id] = $features;
    }
    public function syncFlags(string $groupNameOrId, callable $callback) : void
    {
        $this->setFlags($this->getFlags($groupNameOrId, $callback));
    }
    private function feature(string $group, string $name) : Feature
    {
        $id = $this->groupId($group);
        $stored = $this->groups[$id] ?? null;
        $env = $this->environmentLookupTable[$id][$this->environment] ?? null;
        $fid = $this->featureLookupTable[$id][$name] ?? null;
        if ($stored === null || $env === null || $fid === null) {
            throw new ContractException('lookup', 'Group, environment or feature not installed');
        }
        return $stored->environments[$env]->features[$fid];
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
        $f = $this->feature($groupNameOrId, $featureNameOrId);
        if ($f instanceof ValueFeature) {
            throw new ContractException('kind', 'Value feature requires a value operation');
        }
        if ($f instanceof ToggleFeature) {
            return Scheduler::isScheduledFeatureActive($f) && $f->value;
        }
        Hasher::validateInstance($customInstanceId);
        if (!Scheduler::isScheduledFeatureActive($f)) {
            return false;
        }
        if ($f instanceof GradualFeature) {
            return Hasher::hashString(Hasher::instanceText($customInstanceId), $f->seed) < $f->value;
        }
        if ($f instanceof SelectiveFeature) {
            if ($f->valueType === 'string') {
                return is_string($customInstanceId) && in_array($customInstanceId, $f->value, true);
            }
            if (!is_int($customInstanceId) && !is_float($customInstanceId)) {
                return false;
            }
            foreach ($f->value as $v) {
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
        $f = $this->feature($groupNameOrId, $featureNameOrId);
        if (!$f instanceof ValueFeature) {
            throw new ContractException('kind', 'Expected value feature');
        }
        return Scheduler::isScheduledFeatureActive($f) ? $f->value : $default;
    }
    private function typedValue(string $group, string $name, $default, string $class)
    {
        $f = $this->feature($group, $name);
        if (!$f instanceof $class) {
            throw new ContractException('kind', 'Value subtype differs');
        }
        return Scheduler::isScheduledFeatureActive($f) ? $f->value : $default;
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
