<?php

namespace Vexilla;

class Hasher
{
    public static function validateInstance($value) : void
    {
        if (is_string($value) && Compatibility::unicode($value)) {
            return;
        }
        if ((is_int($value) || is_float($value)) && is_finite((float) $value)) {
            if (!is_int($value) || sprintf('%.0f', (float) $value) === (string) $value) {
                return;
            }
        }
        throw new ContractException('instance', 'Instance ID must be a Unicode scalar string or exact finite binary64 number');
    }
    public static function instanceText($value) : string
    {
        self::validateInstance($value);
        if (is_string($value)) {
            return $value;
        }
        $n = (float) $value;
        if ($n == 0) {
            return '0';
        }
        $old = ini_get('serialize_precision');
        ini_set('serialize_precision', '-1');
        try {
            $text = json_encode(abs($n), JSON_THROW_ON_ERROR);
        } finally {
            ini_set('serialize_precision', $old);
        }
        $parts = explode('e', strtolower($text));
        $mantissa = $parts[0];
        $power = isset($parts[1]) ? (int) $parts[1] : 0;
        $dot = strpos($mantissa, '.');
        $point = ($dot === false ? strlen($mantissa) : $dot) + $power;
        $digits = str_replace('.', '', $mantissa);
        while (strlen($digits) > 1 && $digits[0] === '0') {
            $digits = substr($digits, 1);
            $point--;
        }
        $digits = rtrim($digits, '0');
        $sign = $n < 0 ? '-' : '';
        $length = strlen($digits);
        if ($point > 0 && $point <= 21) {
            return $sign . ($length <= $point ? $digits . str_repeat('0', $point - $length) : substr($digits, 0, $point) . '.' . substr($digits, $point));
        }
        if ($point <= 0 && $point > -6) {
            return $sign . '0.' . str_repeat('0', -$point) . $digits;
        }
        $exponent = $point - 1;
        return $sign . $digits[0] . ($length > 1 ? '.' . substr($digits, 1) : '') . 'e' . ($exponent >= 0 ? '+' : '-') . abs($exponent);
    }
    public static function hashFnv32a($text) : int
    {
        if (!is_string($text) || !Compatibility::unicode($text)) {
            throw new ContractException('instance', 'Malformed Unicode instance ID');
        }
        $hash = 2166136261;
        for ($i = 0; $i < strlen($text); $i++) {
            $hash = ($hash ^ ord($text[$i])) * 16777619 & 0xffffffff;
        }
        return $hash;
    }
    public static function hashString($stringToHash, float $seed) : float
    {
        return fmod(self::hashFnv32a($stringToHash) * $seed, 1000.0) / 1000.0;
    }
}
