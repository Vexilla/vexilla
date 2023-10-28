<?php

namespace Vexilla;

class Hasher {

    /**
        * @param float $stringToHash
     */
    static function hashString(string $stringToHash, float $seed) {
        $splitString = str_split($stringToHash);
        $characters = array_map(
            function($current) {
                return mb_ord($current);
            },
            $splitString,
        );

        $sum = array_reduce(
            $characters,
            function($sum, $current) {
            return $sum + $current;
            },
            0
        );

        return floor($sum * $seed * 42.0) % 100 / 100;
    }
}
