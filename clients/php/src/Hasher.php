<?php

namespace Vexilla;

class Hasher
{
    private static $FNV_OFFSET_BASIS = 2166136261;
    private static $FNV_PRIME = 16777619;

    /**
     * @param float $stringToHash
     */
    static function hashString(string $stringToHash, float $seed)
    {
        $splitString = str_split($stringToHash);
        $length = count($splitString);
        $hashResult = self::$FNV_OFFSET_BASIS;

        for ($i = 0; $i < $length; $i++) {
            $hashResult = abs($hashResult ^ mb_ord($splitString[$i]));
            $hashResult = ($hashResult * self::$FNV_PRIME) & 0xFFFFFFFF;
        }

        return ($hashResult * $seed) % 1000 / 1000;
    }
}
