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
    public static function obj($v) : object
    {
        self::check($v instanceof \stdClass, 'Expected a JSON object');
        return $v;
    }
    public static function text($v, bool $nonempty = false) : string
    {
        self::check(is_string($v) && (!$nonempty || $v !== ''), 'Expected a string');
        return $v;
    }
    public static function number($v, bool $integer = false) : float
    {
        self::check((is_int($v) || is_float($v)) && is_finite((float) $v) && (!$integer || floor($v) == $v && abs($v) <= 9007199254740991), 'Expected finite number in integer bounds');
        return (float) $v;
    }
    public static function tree($v) : void
    {
        if (is_string($v)) {
            self::check(Compatibility::unicode($v), 'Malformed Unicode string');
        } elseif (is_array($v) || is_object($v)) {
            foreach ($v as $key => $item) {
                self::check(Compatibility::unicode((string) $key), 'Malformed Unicode key');
                self::tree($item);
            }
        }
    }
    private static function member($v, array $allowed) : void
    {
        self::check(is_string($v) && in_array($v, $allowed, true), 'Unsupported enum');
    }
    private static function safeId($v) : string
    {
        $id = self::text($v, true);
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
        $f = self::obj($value);
        self::text($f->name ?? null);
        self::text($f->featureId ?? null, true);
        self::member($f->scheduleType ?? null, ['', 'global', 'environment']);
        self::schedule($f->schedule ?? null);
        $kind = $f->featureType ?? null;
        if ($kind === 'toggle') {
            self::check(isset($f->value) && is_bool($f->value), 'Toggle must be boolean');
        } elseif ($kind === 'gradual') {
            self::number($f->value ?? null);
            $seed = self::number($f->seed ?? null);
            self::check($seed > 0 && $seed <= 1, 'Seed must satisfy 0 < seed <= 1');
        } elseif ($kind === 'selective' || $kind === 'value') {
            self::member($f->valueType ?? null, ['string', 'number']);
            $numeric = $f->valueType === 'number';
            if ($numeric) {
                self::member($f->numberType ?? null, ['int', 'float']);
            }
            $item = function ($v) use($f, $numeric) {
                if ($numeric) {
                    self::number($v, $f->numberType === 'int');
                } else {
                    self::text($v);
                }
            };
            if ($kind === 'selective') {
                self::check(isset($f->value) && is_array($f->value), 'Selective must be array');
                foreach ($f->value as $v) {
                    $item($v);
                }
            } else {
                $item($f->value ?? null);
            }
        } else {
            self::check(false, 'Unsupported featureType');
        }
    }
    private static function features($value) : object
    {
        $fields = self::obj($value);
        $aliases = [];
        foreach ($fields as $id => $f) {
            self::feature($f);
            self::check($f->featureId === (string) $id, 'Feature map ID mismatch');
            self::alias($aliases, (string) $id, $f->name);
        }
        return $fields;
    }
    public static function manifest($value) : void
    {
        self::tree($value);
        $m = self::obj($value);
        self::check(($m->version ?? null) === 'v1', 'Manifest version must be v1');
        self::check(isset($m->groups) && is_array($m->groups), 'Groups must be array');
        $ids = [];
        $aliases = [];
        foreach ($m->groups as $raw) {
            $g = self::obj($raw);
            $id = self::safeId($g->groupId ?? null);
            self::check(!isset($ids[$id]), 'Duplicate group ID');
            $ids[$id] = true;
            self::alias($aliases, $id, self::text($g->name ?? null));
        }
    }
    private static function same(object $a, object $b, string $key) : bool
    {
        $pa = property_exists($a, $key);
        $pb = property_exists($b, $key);
        if (!$pa || !$pb) {
            return $pa === $pb;
        }
        $x = $a->{$key};
        $y = $b->{$key};
        if (is_array($x) || is_object($x) || is_array($y) || is_object($y)) {
            return false;
        }
        if ((is_int($x) || is_float($x)) && (is_int($y) || is_float($y))) {
            return (float) $x === (float) $y;
        }
        return $x === $y;
    }
    public static function group($value) : void
    {
        self::tree($value);
        $g = self::obj($value);
        self::safeId($g->groupId ?? null);
        self::text($g->name ?? null);
        self::check((self::obj($g->meta ?? null)->version ?? null) === 'v1', 'Group version must be v1');
        $defaults = self::features($g->features ?? null);
        $envs = self::obj($g->environments ?? null);
        $aliases = [];
        foreach ($envs as $id => $raw) {
            $e = self::obj($raw);
            self::check(self::text($e->environmentId ?? null, true) === (string) $id, 'Environment map ID mismatch');
            self::alias($aliases, (string) $id, self::text($e->name ?? null));
            $features = self::features($e->features ?? null);
            $a = array_keys(get_object_vars($features));
            $b = array_keys(get_object_vars($defaults));
            sort($a);
            sort($b);
            self::check($a === $b, 'Incomplete environment feature set');
            foreach ($features as $fid => $f) {
                foreach (['name', 'featureType', 'valueType', 'numberType'] as $key) {
                    self::check(self::same($f, $defaults->{$fid}, $key), 'Environment feature identity/subtype mismatch');
                }
            }
        }
    }
}
