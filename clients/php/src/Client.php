<?php

namespace Vexilla;

use Vexilla\Types\Environment;
use Vexilla\Types\Feature;
use Vexilla\Types\FeatureType;
use Vexilla\Types\GradualFeature;
use Vexilla\Types\Group;
use Vexilla\Types\GroupMeta;
use Vexilla\Types\Manifest;
use Vexilla\Types\ManifestGroup;
use Vexilla\Types\NumberType;
use Vexilla\Types\RealIds;
use Vexilla\Types\SelectiveFeature;
use Vexilla\Types\ToggleFeature;
use Vexilla\Types\ValueFloatFeature;
use Vexilla\Types\ValueIntFeature;
use Vexilla\Types\ValueStringFeature;
use Vexilla\Types\ValueType;
use Vexilla\Exceptions\InvalidShouldFeatureValueTypeException;
use Vexilla\Exceptions\InvalidShouldFeatureTypeException;
use Vexilla\Exceptions\InvalidValueFeatureTypeException;
use Vexilla\Exceptions\GroupLookupKeyNotFoundException;
use Vexilla\Exceptions\EnvironmentLookupKeyNotFoundException;
use Vexilla\Exceptions\GroupFeatureKeyNotFoundException;
use Vexilla\Exceptions\EnvironmentFeatureKeyNotFoundException;


class Client
{
    private string $baseUrl;
    private string $environment;
    private string $customInstanceHash;

    private Manifest $manifest;
    private array $groups;

    private array $groupLookupTable;
    private array $environmentLookupTable;
    private array $featureLookupTable;

    private bool $showLogs;

    function __construct(string $baseUrl, string $environment, string $customInstanceHash, bool $showLogs = false)
    {
        $this->baseUrl = $baseUrl;
        $this->environment = $environment;
        $this->customInstanceHash = $customInstanceHash;
        $this->showLogs = $showLogs;

        $this->groupLookupTable = [];
        $this->environmentLookupTable = [];
        $this->featureLookupTable = [];
    }

    public function getManifest(callable $callback): Manifest
    {

        $decodedJson = $callback(
            sprintf(
                '%s/manifest.json',
                $this->baseUrl
            )
        );

        $groups = [];

        foreach ($decodedJson->groups as &$group) {
            $group = new ManifestGroup($group->name, $group->groupId);
            array_push($groups, $group);
        }

        $manifest = new Manifest(
            $decodedJson->version,
            $groups
        );

        return $manifest;
    }

    public function setManifest(Manifest $manifest)
    {
        $this->manifest = $manifest;

        $groupLookupTable = [];

        foreach ($manifest->groups as $group) {
            $groupLookupTable[$group->name] = $group->groupId;
            $groupLookupTable[$group->groupId] = $group->groupId;
        }

        unset($group);

        $this->groupLookupTable = $groupLookupTable;
    }

    public function syncManifest(callable $callback)
    {
        $manifest = $this->getManifest($callback);
        $this->setManifest($manifest);
    }

    /*  $callback contents
        $response = file_get_contents(
            $url
        );

        $decodedJson = json_decode($response);
    */

    public function getFlags(string $groupNameOrId, callable $callback): Group
    {

        $groupId = $this->groupLookupTable[$groupNameOrId];

        $decodedJson = $callback(
            sprintf(
                '%s/%s.json',
                $this->baseUrl,
                $groupId
            )
        );

        $environments = [];

        foreach ($decodedJson->environments as $rawEnvironment) {
            $environmentFeatures = [];

            foreach ($rawEnvironment->features as $rawFeature) {
                $feature = null;

                if ($rawFeature->featureType === FeatureType::TOGGLE) {
                    $feature = ToggleFeature::fromRaw($rawFeature);
                } else if ($rawFeature->featureType === FeatureType::GRADUAL) {
                    $feature = GradualFeature::fromRaw($rawFeature);
                } else if ($rawFeature->featureType === FeatureType::SELECTIVE) {
                    $feature = SelectiveFeature::fromRaw($rawFeature);
                } else if ($rawFeature->featureType === FeatureType::VALUE) {
                    if ($rawFeature->valueType === ValueType::STRING) {
                        $feature = ValueStringFeature::fromRaw($rawFeature);
                    } else if ($rawFeature->numberType == NumberType::INT) {
                        $feature = ValueIntFeature::fromRaw($rawFeature);
                    } else if ($rawFeature->numberType === NumberType::FLOAT) {
                        $feature = ValueFloatFeature::fromRaw($rawFeature);
                    }
                }

                if ($feature) {
                    $environmentFeatures[$rawFeature->featureId] = $feature;
                }

            }

            unset($rawFeature);

            $environment = new Environment($rawEnvironment->name, $rawEnvironment->environmentId, $environmentFeatures);

            $environments[$environment->environmentId] = $environment;
        }

        unset($rawEnvironment);

        $features = [];

        foreach ($decodedJson->features as $rawFeature) {
            $feature = Feature::fromRaw($rawFeature);
            $features[$feature->featureId] = $feature;
        }

        unset($rawFeature);

        $group = new Group($decodedJson->name, $decodedJson->groupId, new GroupMeta($decodedJson->meta->version), $environments, $features);

        return $group;
    }

    public function setFlags(Group $flagGroup): void
    {

        $this->groups[$flagGroup->groupId] = $flagGroup;

        if (!$this->environmentLookupTable) {
            $this->environmentLookupTable = [];
        }

        if (!isset($this->environmentLookupTable, $flagGroup->groupId)) {
            $this->environmentLookupTable[$flagGroup->groupId] = [];
        }

        foreach ($flagGroup->environments as $environment) {
            $this->environmentLookupTable[$flagGroup->groupId][$environment->name] = $environment->environmentId;
            $this->environmentLookupTable[$flagGroup->groupId][$environment->environmentId] = $environment->environmentId;
        }

        if (!isset($this->featureLookupTable, $flagGroup->groupId)) {
            $this->featureLookupTable[$flagGroup->groupId] = [];
        }

        foreach ($flagGroup->features as $feature) {
            $this->featureLookupTable[$flagGroup->groupId][$feature->name] = $feature->featureId;
            $this->featureLookupTable[$flagGroup->groupId][$feature->featureId] = $feature->featureId;
        }
    }

    public function syncFlags(string $groupNameOrId, callable $callback): void
    {
        $group = $this->getFlags($groupNameOrId, $callback);
        $this->setFlags($group);
    }

    public function should(string $groupNameOrId, string $featureNameOrId): bool
    {
        return $this->shouldCustomString($groupNameOrId, $featureNameOrId, $this->customInstanceHash);
    }

    public function shouldCustomString(string $groupNameOrId, string $featureNameOrId, string $customInstanceId): bool
    {
        $realObjects = $this->getRealObjects($groupNameOrId, $featureNameOrId);

        $environment = $realObjects->environment;
        $feature = $realObjects->feature;

        $withinSchedule = Scheduler::isScheduledFeatureActive($feature);

        if (!$withinSchedule) {
            return false;
        }

        switch ($feature->featureType) {
            case FeatureType::TOGGLE:
                $toggleFeature = $environment->getToggleFeature($feature->featureId);
                return $toggleFeature->value;
            case FeatureType::GRADUAL:
                $gradualFeature = $environment->getGradualFeature($feature->featureId);
                return Hasher::hashString($customInstanceId, $gradualFeature->seed) <= $gradualFeature->value;
            case FeatureType::SELECTIVE:
                $selectiveFeature = $environment->getSelectiveFeature($feature->featureId);


                if ($selectiveFeature->valueType === ValueType::STRING) {
                    return in_array($customInstanceId, $selectiveFeature->value);
                } else {
                    throw new InvalidShouldFeatureValueTypeException('shouldCustomString must be called with a string instanceId. Use shouldCustomInt or shouldCustomFloat, instead.');
                }
            case FeatureType::VALUE:
                throw new InvalidShouldFeatureTypeException('should* functions are not compatible with ValueFeatures. Use the value* methods instead.');

            default:
                throw new InvalidShouldFeatureTypeException('Invalid FeatureType for should* methods. Must be toggle, gradual, or selective.');
        }
    }

    public function shouldCustomInt(string $groupNameOrId, string $featureNameOrId, int $customInstanceId): bool
    {
        $realObjects = $this->getRealObjects($groupNameOrId, $featureNameOrId);

        $environment = $realObjects->environment;
        $feature = $realObjects->feature;

        $withinSchedule = Scheduler::isScheduledFeatureActive($feature);

        if (!$withinSchedule) {
            return false;
        }

        switch ($feature->featureType) {
            case FeatureType::TOGGLE:
                $toggleFeature = $environment->getToggleFeature($feature->featureId);
                return $toggleFeature->value;
            case FeatureType::GRADUAL:
                $gradualFeature = $environment->getGradualFeature($feature->featureId);
                return Hasher::hashString("$customInstanceId", $gradualFeature->seed) <= $gradualFeature->value;
            case FeatureType::SELECTIVE:
                $selectiveFeature = $environment->getSelectiveFeature($feature->featureId);

                if ($selectiveFeature->numberType === NumberType::INT) {
                    return in_array($customInstanceId, $selectiveFeature->value);
                } else {
                    throw new InvalidShouldFeatureValueTypeException('shouldCustomInt must be called with an int instanceId. Use shouldCustomString or shouldCustomFloat, instead.');
                }
            case FeatureType::VALUE:
                throw new InvalidShouldFeatureTypeException('should* functions are not compatible with ValueFeatures. Use the value* methods instead.');

            default:
                throw new InvalidShouldFeatureTypeException('Invalid FeatureType for should* methods. Must be toggle, gradual, or selective.');
        }
    }

    public function shouldCustomFloat(string $groupNameOrId, string $featureNameOrId, float $customInstanceId): bool
    {
        $realObjects = $this->getRealObjects($groupNameOrId, $featureNameOrId);

        $environment = $realObjects->environment;
        $feature = $realObjects->feature;

        $withinSchedule = Scheduler::isScheduledFeatureActive($feature);

        if (!$withinSchedule) {
            return false;
        }

        switch ($feature->featureType) {
            case FeatureType::TOGGLE:
                $toggleFeature = $environment->getToggleFeature($feature->featureId);
                return $toggleFeature->value;
            case FeatureType::GRADUAL:
                $gradualFeature = $environment->getGradualFeature($feature->featureId);
                return Hasher::hashString("$customInstanceId", $gradualFeature->seed) <= $gradualFeature->value;
            case FeatureType::SELECTIVE:
                $selectiveFeature = $environment->getSelectiveFeature($feature->featureId);

                if ($selectiveFeature->numberType === NumberType::FLOAT) {
                    return in_array($customInstanceId, $selectiveFeature->value);
                } else {
                    throw new InvalidShouldFeatureValueTypeException('shouldCustomFloat must be called with a float instanceId. Use shouldCustomInt or shouldCustomString, instead.');
                }
            case FeatureType::VALUE:
                throw new InvalidShouldFeatureTypeException('should* functions are not compatible with ValueFeatures. Use the value* methods instead.');

            default:
                throw new InvalidShouldFeatureTypeException('Invalid FeatureType for should* methods. Must be toggle, gradual, or selective.');
        }
    }

    public function valueString(string $groupNameOrId, string $featureNameOrId, string $default): string
    {
        $realObjects = $this->getRealObjects($groupNameOrId, $featureNameOrId);

        $environment = $realObjects->environment;
        $feature = $realObjects->feature;

        if ($feature->featureType !== FeatureType::VALUE) {
            throw new InvalidValueFeatureTypeException('valueString must be called for a ValueFeature. Use a should* method, instead.');
        }

        $withinSchedule = Scheduler::isScheduledFeatureActive($feature);

        if (!$withinSchedule) {
            return $default;
        }

        $valueFeature = $environment->getValueStringFeature($feature->featureId);

        return $valueFeature->value;
    }

    public function valueInt(string $groupNameOrId, string $featureNameOrId, int $default): int
    {
        $realObjects = $this->getRealObjects($groupNameOrId, $featureNameOrId);

        $environment = $realObjects->environment;
        $feature = $realObjects->feature;

        if ($feature->featureType !== FeatureType::VALUE) {
            throw new InvalidValueFeatureTypeException('valueInt must be called for a ValueFeature. Use a should* method, instead.');
        }

        $withinSchedule = Scheduler::isScheduledFeatureActive($feature);

        if (!$withinSchedule) {
            return $default;
        }

        $valueFeature = $environment->getValueIntFeature($feature->featureId);

        return $valueFeature->value;
    }

    public function valueFloat(string $groupNameOrId, string $featureNameOrId, float $default): float
    {
        $realObjects = $this->getRealObjects($groupNameOrId, $featureNameOrId);

        $environment = $realObjects->environment;
        $feature = $realObjects->feature;

        if ($feature->featureType !== FeatureType::VALUE) {
            throw new InvalidValueFeatureTypeException('valueInt must be called for a ValueFeature. Use a should* method, instead.');
        }

        $withinSchedule = Scheduler::isScheduledFeatureActive($feature);

        if (!$withinSchedule) {
            return $default;
        }

        $valueFeature = $environment->getValueFloatFeature($feature->featureId);

        return $valueFeature->value;
    }

    private function getGroup(string $groupId): ?Group
    {
        return $this->groups[$groupId];
    }

    private function getRealObjects(string $groupNameOrId, string $featureNameOrId): RealObjects
    {
        $realIds = $this->getRealIds($groupNameOrId, $featureNameOrId);

        $group = $this->getGroup($realIds->groupId);

        if (!$group) {
            throw new GroupLookupKeyNotFoundException("Group not found.");
        }

        $environment = $group->getEnvironment($realIds->environmentId);

        if (!$environment) {
            throw new EnvironmentLookupKeyNotFoundException("Environment not found.");
        }

        $feature = $environment->getFeature($realIds->featureId);

        if (!$feature) {
            throw new EnvironmentFeatureKeyNotFoundException("Feature not found.");
        }

        return new RealObjects($environment, $feature);
    }

    private function getRealIds(string $groupNameOrId, string $featureNameOrId): RealIds
    {
        $groupId = $this->groupLookupTable[$groupNameOrId];

        if (!$groupId) {
            throw new GroupLookupKeyNotFoundException('GroupID does not exist in lookup table. Make sure to fetch the manifest before hand.');
        }

        $groupEnvironmentLookupTable = $this->environmentLookupTable[$groupId];

        if (!$groupEnvironmentLookupTable) {
            throw new EnvironmentLookupKeyNotFoundException('Group EnvironmentLookupTable does not exist in lookup table. Make sure to fetch the manifest and group/flags before hand.');
        }

        $environmentId = $groupEnvironmentLookupTable[$this->environment];

        if (!$environmentId) {
            throw new EnvironmentLookupKeyNotFoundException('Environment does not exist in lookup table. Make sure to fetch the manifest and group/flags before hand.');
        }

        $groupFeatureLookupTable = $this->featureLookupTable[$groupId];

        if (!$groupFeatureLookupTable) {
            throw new GroupFeatureKeyNotFoundException('Group FeatureLookupTable does not exist in lookup table. Make sure to fetch the manifest and group/flags before hand.');
        }

        $featureId = $groupFeatureLookupTable[$featureNameOrId];

        if (!$featureId) {
            throw new EnvironmentFeatureKeyNotFoundException('Feature does not exist in lookup table. Make sure to fetch the manifest and group/flags before hand.');
        }

        return new RealIds($groupId, $environmentId, $featureId);
    }

    private function log(string $message)
    {
        if ($this->showLogs) {
            echo $message;
            error_log($message);
        }
    }
}

class RealObjects
{
    public Environment $environment;
    public Feature $feature;

    function __construct(Environment $environment, Feature $feature)
    {
        $this->environment = $environment;
        $this->feature = $feature;
    }
}
