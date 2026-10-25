<?php

namespace Vexilla;

class Validation
{
    public static function check(bool $ok, string $message) : void
    {
        if (!$ok) {
            throw new ContractException('validation', $message);
        }
    }
    public static function obj($value) : object
    {
        self::check($value instanceof \stdClass, 'Expected a JSON object');
        return $value;
    }
    public static function text($value, bool $nonempty = false) : string
    {
        self::check(is_string($value) && (!$nonempty || $value !== ''), 'Expected a string');
        return $value;
    }
    public static function number($value, bool $integer = false) : float
    {
        self::check((is_int($value) || is_float($value)) && is_finite((float) $value) && (!$integer || floor($value) == $value && abs($value) <= 9007199254740991), 'Expected finite number in integer bounds');
        return (float) $value;
    }
    public static function tree($value) : void
    {
        if (is_string($value)) {
            self::check(Compatibility::unicode($value), 'Malformed Unicode string');
        } elseif (is_array($value) || is_object($value)) {
            foreach ($value as $key => $item) {
                self::check(Compatibility::unicode((string) $key), 'Malformed Unicode key');
                self::tree($item);
            }
        }
    }
    private static function member($value, array $allowed) : void
    {
        self::check(is_string($value) && in_array($value, $allowed, true), 'Unsupported enum');
    }
    private static function safeId($value) : string
    {
        $id = self::text($value, true);
        self::check(!in_array($id, ['manifest', 'config', '.', '..'], true) && strpos($id, '/') === false && strpos($id, '\\') === false && strpos($id, "\x00") === false, 'Unsafe group ID');
        return $id;
    }
    public static function alias(array &$aliases, string $id, string $name) : void
    {
        foreach ([$id, $name, Compatibility::normalize($name)] as $key) {
            self::check(!array_key_exists($key, $aliases) || $aliases[$key] === $id, 'Alias collision');
            $aliases[$key] = $id;
        }
    }
    public static function schedule($value) : void
    {
        self::tree($value);
        $s = self::obj($value);
        foreach (['start', 'end', 'startTime', 'endTime'] as $key) {
            self::number($s->{$key} ?? null, true);
        }
        self::member($s->timeType ?? null, ['none', 'start/end', 'daily']);
        self::check(Compatibility::timezone(self::text($s->timezone ?? null, true)), 'Invalid timezone');
    }
    public static function feature($value) : void
    {
        self::tree($value);
        $feature = self::obj($value);
        self::text($feature->name ?? null);
        self::text($feature->featureId ?? null, true);
        self::member($feature->scheduleType ?? null, ['', 'global', 'environment']);
        self::schedule($feature->schedule ?? null);
        $kind = $feature->featureType ?? null;
        if ($kind === 'toggle') {
            self::check(isset($feature->value) && is_bool($feature->value), 'Toggle must be boolean');
        } elseif ($kind === 'gradual') {
            self::number($feature->value ?? null);
            $seed = self::number($feature->seed ?? null);
            self::check($seed > 0 && $seed <= 1, 'Seed must satisfy 0 < seed <= 1');
        } elseif ($kind === 'selective' || $kind === 'value') {
            self::member($feature->valueType ?? null, ['string', 'number']);
            $numeric = $feature->valueType === 'number';
            if ($numeric) {
                self::member($feature->numberType ?? null, ['int', 'float']);
            }
            $item = function ($value) use($feature, $numeric) {
                if ($numeric) {
                    self::number($value, $feature->numberType === 'int');
                } else {
                    self::text($value);
                }
            };
            if ($kind === 'selective') {
                self::check(isset($feature->value) && is_array($feature->value), 'Selective must be array');
                foreach ($feature->value as $value) {
                    $item($value);
                }
            } else {
                $item($feature->value ?? null);
            }
        } else {
            self::check(false, 'Unsupported featureType');
        }
    }
    private static function features($value) : object
    {
        $fields = self::obj($value);
        $aliases = [];
        foreach ($fields as $id => $feature) {
            self::feature($feature);
            self::check($feature->featureId === (string) $id, 'Feature map ID mismatch');
            self::alias($aliases, (string) $id, $feature->name);
        }
        return $fields;
    }
    public static function manifest($value) : void
    {
        self::tree($value);
        $manifest = self::obj($value);
        self::check(($manifest->version ?? null) === 'v1', 'Manifest version must be v1');
        self::check(isset($manifest->groups) && is_array($manifest->groups), 'Groups must be array');
        $ids = [];
        $aliases = [];
        foreach ($manifest->groups as $raw) {
            $group = self::obj($raw);
            $id = self::safeId($group->groupId ?? null);
            self::check(!isset($ids[$id]), 'Duplicate group ID');
            $ids[$id] = true;
            self::alias($aliases, $id, self::text($group->name ?? null));
        }
    }
    private static function same(object $environmentFeature, object $groupFeature, string $key) : bool
    {
        $hasEnvironmentProperty = property_exists($environmentFeature, $key);
        $hasGroupProperty = property_exists($groupFeature, $key);
        if (!$hasEnvironmentProperty || !$hasGroupProperty) {
            return $hasEnvironmentProperty === $hasGroupProperty;
        }
        $environmentValue = $environmentFeature->{$key};
        $groupValue = $groupFeature->{$key};
        if (is_array($environmentValue) || is_object($environmentValue) || is_array($groupValue) || is_object($groupValue)) {
            return false;
        }
        if ((is_int($environmentValue) || is_float($environmentValue)) && (is_int($groupValue) || is_float($groupValue))) {
            return (float) $environmentValue === (float) $groupValue;
        }
        return $environmentValue === $groupValue;
    }
    public static function group($value) : void
    {
        self::tree($value);
        $group = self::obj($value);
        self::safeId($group->groupId ?? null);
        self::text($group->name ?? null);
        self::check((self::obj($group->meta ?? null)->version ?? null) === 'v1', 'Group version must be v1');
        $defaults = self::features($group->features ?? null);
        $envs = self::obj($group->environments ?? null);
        $aliases = [];
        foreach ($envs as $id => $raw) {
            $environment = self::obj($raw);
            self::check(self::text($environment->environmentId ?? null, true) === (string) $id, 'Environment map ID mismatch');
            self::alias($aliases, (string) $id, self::text($environment->name ?? null));
            $features = self::features($environment->features ?? null);
            $environmentFeatureIds = array_keys(get_object_vars($features));
            $groupFeatureIds = array_keys(get_object_vars($defaults));
            sort($environmentFeatureIds);
            sort($groupFeatureIds);
            self::check($environmentFeatureIds === $groupFeatureIds, 'Incomplete environment feature set');
            foreach ($features as $featureId => $feature) {
                foreach (['name', 'featureType', 'valueType', 'numberType'] as $key) {
                    self::check(self::same($feature, $defaults->{$featureId}, $key), 'Environment feature identity/subtype mismatch');
                }
            }
        }
    }
}
