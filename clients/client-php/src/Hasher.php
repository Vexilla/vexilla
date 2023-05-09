<?php

namespace Vexilla;

class Hasher {

    /**
       * The seed value used for hashing the customInstanceHash
       *
       * @var float
       */
    private $seed;

    /**
        * @param float $seed
        * @param bool $mbAware
     */
    function __construct($seed, $mbAware = true) {
        $this->seed = $seed;
        $this->mbAware = $mbAware;
    }

    /**
        * @param float $stringToHash
     */
    function hashString($stringToHash) {

        $splitString = str_split($stringToHash);
        if($this->mbAware) {
            $splitString = mb_split("", $stringToHash);
        }

        $characters = array_map(
            function($current) {
                if($this->mbAware) {
                    return mb_ord($current);
                } else {
                    return ord($current);
                }
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

        return floor($sum * $this->seed * 42.0) % 100;
    }
}
