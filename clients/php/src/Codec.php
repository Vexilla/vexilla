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
        } catch (\JsonException $e) {
            throw new ContractException('validation', 'Invalid JSON: ' . $e->getMessage());
        }
    }
    public static function manifest($value) : Manifest
    {
        $m = self::parse($value);
        Validation::manifest($m);
        return new Manifest($m->version, array_map(function ($g) {
            return new ManifestGroup($g->name, $g->groupId);
        }, $m->groups));
    }
    public static function feature(object $raw) : Feature
    {
        Validation::feature($raw);
        switch ($raw->featureType) {
            case 'toggle':
                return ToggleFeature::fromRaw($raw);
            case 'gradual':
                return GradualFeature::fromRaw($raw);
            case 'selective':
                return SelectiveFeature::fromRaw($raw);
            default:
                if ($raw->valueType === 'string') {
                    return ValueStringFeature::fromRaw($raw);
                }
                if ($raw->numberType === 'int') {
                    return ValueIntFeature::fromRaw($raw);
                }
                return ValueFloatFeature::fromRaw($raw);
        }
    }
    private static function features(object $raw) : array
    {
        $out = [];
        foreach ($raw as $id => $f) {
            $out[$id] = self::feature($f);
        }
        return $out;
    }
    public static function group($value) : Group
    {
        $g = self::parse($value);
        Validation::group($g);
        $environments = [];
        foreach ($g->environments as $id => $e) {
            $environments[$id] = new Environment($e->name, $e->environmentId, self::features($e->features));
        }
        return new Group($g->name, $g->groupId, new GroupMeta($g->meta->version), $environments, self::features($g->features));
    }
    private static function featureWire(Feature $f) : object
    {
        $kind = $f instanceof ToggleFeature ? 'toggle' : ($f instanceof GradualFeature ? 'gradual' : ($f instanceof SelectiveFeature ? 'selective' : ($f instanceof ValueStringFeature || $f instanceof ValueIntFeature || $f instanceof ValueFloatFeature ? 'value' : null)));
        $fields = get_object_vars($f);
        Validation::check($kind !== null && $kind === ($fields['featureType'] ?? null), 'Native feature subtype mismatch');
        Validation::check(($fields['schedule'] ?? null) instanceof \Vexilla\Types\Schedule, 'Native Schedule required');
        // Preserve native extras until full group validation has compared subtype identities.
        $wire = (object) $fields;
        $wire->schedule = (object) get_object_vars($fields['schedule']);
        if ($kind === 'value') {
            $type = $fields['valueType'] ?? null;
            $number = $fields['numberType'] ?? null;
            Validation::check($f instanceof ValueStringFeature && $type === 'string' || $f instanceof ValueIntFeature && $type === 'number' && $number === 'int' || $f instanceof ValueFloatFeature && $type === 'number' && $number === 'float', 'Native value subtype mismatch');
        }
        return $wire;
    }
    private static function featureMap(array $features) : object
    {
        $out = new \stdClass();
        foreach ($features as $id => $f) {
            Validation::check($f instanceof Feature, 'Native Feature required');
            $out->{(string) $id} = self::featureWire($f);
        }
        return $out;
    }
    public static function wire($value) : object
    {
        $fields = get_object_vars($value);
        if ($value instanceof Manifest) {
            Validation::check(isset($fields['groups']) && is_array($fields['groups']), 'Native manifest groups required');
            $groups = [];
            foreach ($fields['groups'] as $g) {
                Validation::check($g instanceof ManifestGroup, 'Native ManifestGroup required');
                $groups[] = (object) get_object_vars($g);
            }
            $fields['groups'] = $groups;
            return (object) $fields;
        }
        if ($value instanceof Group) {
            Validation::check(($fields['meta'] ?? null) instanceof GroupMeta, 'Native GroupMeta required');
            Validation::check(isset($fields['features'], $fields['environments']) && is_array($fields['features']) && is_array($fields['environments']), 'Native group maps required');
            $envs = new \stdClass();
            foreach ($fields['environments'] as $id => $e) {
                Validation::check($e instanceof Environment, 'Native Environment required');
                $env = get_object_vars($e);
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
