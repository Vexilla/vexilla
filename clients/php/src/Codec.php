<?php

namespace Vexilla;

use Vexilla\Types\{Manifest, ManifestGroup, Group, GroupMeta, Environment, Feature, ToggleFeature, GradualFeature, SelectiveFeature, ValueStringFeature, ValueIntFeature, ValueFloatFeature};
class Codec
{
    public static function parse($value)
    {
        if (!is_string($value)) {
            return $value;
        }
        try {
            return json_decode($value, false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $error) {
            throw new ContractException('validation', 'Invalid JSON: ' . $error->getMessage());
        }
    }
    public static function manifest($value) : Manifest
    {
        $manifest = self::parse($value);
        Validation::manifest($manifest);
        return new Manifest($manifest->version, array_map(function ($group) {
            return new ManifestGroup($group->name, $group->groupId);
        }, $manifest->groups));
    }
    public static function feature(object $sourceData) : Feature
    {
        Validation::feature($sourceData);
        switch ($sourceData->featureType) {
            case 'toggle':
                return ToggleFeature::fromRaw($sourceData);
            case 'gradual':
                return GradualFeature::fromRaw($sourceData);
            case 'selective':
                return SelectiveFeature::fromRaw($sourceData);
            default:
                if ($sourceData->valueType === 'string') {
                    return ValueStringFeature::fromRaw($sourceData);
                }
                if ($sourceData->numberType === 'int') {
                    return ValueIntFeature::fromRaw($sourceData);
                }
                return ValueFloatFeature::fromRaw($sourceData);
        }
    }
    private static function features(object $sourceData) : array
    {
        $out = [];
        foreach ($sourceData as $id => $feature) {
            $out[$id] = self::feature($feature);
        }
        return $out;
    }
    public static function group($value) : Group
    {
        $group = self::parse($value);
        Validation::group($group);
        $environments = [];
        foreach ($group->environments as $id => $environment) {
            $environments[$id] = new Environment($environment->name, $environment->environmentId, self::features($environment->features));
        }
        return new Group($group->name, $group->groupId, new GroupMeta($group->meta->version), $environments, self::features($group->features));
    }
    private static function featureWire(Feature $feature) : object
    {
        $kind = $feature instanceof ToggleFeature ? 'toggle' : ($feature instanceof GradualFeature ? 'gradual' : ($feature instanceof SelectiveFeature ? 'selective' : ($feature instanceof ValueStringFeature || $feature instanceof ValueIntFeature || $feature instanceof ValueFloatFeature ? 'value' : null)));
        $fields = get_object_vars($feature);
        Validation::check($kind !== null && $kind === ($fields['featureType'] ?? null), 'Native feature subtype mismatch');
        Validation::check(($fields['schedule'] ?? null) instanceof \Vexilla\Types\Schedule, 'Native Schedule required');
        // Preserve native extras until full group validation has compared subtype identities.
        $wire = (object) $fields;
        $wire->schedule = (object) get_object_vars($fields['schedule']);
        if ($kind === 'value') {
            $type = $fields['valueType'] ?? null;
            $number = $fields['numberType'] ?? null;
            Validation::check($feature instanceof ValueStringFeature && $type === 'string' || $feature instanceof ValueIntFeature && $type === 'number' && $number === 'int' || $feature instanceof ValueFloatFeature && $type === 'number' && $number === 'float', 'Native value subtype mismatch');
        }
        return $wire;
    }
    private static function featureMap(array $features) : object
    {
        $out = new \stdClass();
        foreach ($features as $id => $feature) {
            Validation::check($feature instanceof Feature, 'Native Feature required');
            $out->{(string) $id} = self::featureWire($feature);
        }
        return $out;
    }
    public static function wire($value) : object
    {
        $fields = get_object_vars($value);
        if ($value instanceof Manifest) {
            Validation::check(isset($fields['groups']) && is_array($fields['groups']), 'Native manifest groups required');
            $groups = [];
            foreach ($fields['groups'] as $group) {
                Validation::check($group instanceof ManifestGroup, 'Native ManifestGroup required');
                $groups[] = (object) get_object_vars($group);
            }
            $fields['groups'] = $groups;
            return (object) $fields;
        }
        if ($value instanceof Group) {
            Validation::check(($fields['meta'] ?? null) instanceof GroupMeta, 'Native GroupMeta required');
            Validation::check(isset($fields['features'], $fields['environments']) && is_array($fields['features']) && is_array($fields['environments']), 'Native group maps required');
            $envs = new \stdClass();
            foreach ($fields['environments'] as $id => $environment) {
                Validation::check($environment instanceof Environment, 'Native Environment required');
                $env = get_object_vars($environment);
                Validation::check(isset($env['features']) && is_array($env['features']), 'Native environment features required');
                $env['features'] = self::featureMap($env['features']);
                $envs->{(string) $id} = (object) $env;
            }
            $fields['meta'] = (object) get_object_vars($fields['meta']);
            $fields['features'] = self::featureMap($fields['features']);
            $fields['environments'] = $envs;
            return (object) $fields;
        }
        throw new ContractException('validation', 'Native Manifest or Group required');
    }
}
