<?php

namespace Vexilla;

class Compatibility
{
    private static $data;
    private static function data() : object
    {
        if (!self::$data) {
            self::$data = json_decode(file_get_contents(__DIR__ . '/compatibility.json'), false, 512, JSON_THROW_ON_ERROR);
        }
        return self::$data;
    }
    public static function unicode(string $text) : bool
    {
        return preg_match('//u', $text) === 1;
    }
    public static function timezone(string $text) : bool
    {
        $data = self::data()->timezone;
        $ascii = strtr($text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz');
        foreach ($data->identifiers as $name) {
            if (strtr($name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') === $ascii) {
                return true;
            }
        }
        return preg_match('~\\A(?:' . $data->offsetPattern . ')\\z~D', $text) === 1;
    }
    private static function inRanges(int $code, array $ranges) : bool
    {
        $first = 0;
        $last = count($ranges) - 1;
        while ($first <= $last) {
            $mid = $first + $last >> 1;
            if ($code < $ranges[$mid][0]) {
                $last = $mid - 1;
            } elseif ($code > $ranges[$mid][1]) {
                $first = $mid + 1;
            } else {
                return true;
            }
        }
        return false;
    }
    private static function lower(string $text) : string
    {
        $data = self::data()->unicode;
        $chars = mb_str_split($text, 1, 'UTF-8');
        $out = '';
        foreach ($chars as $i => $ch) {
            if ($ch !== "Σ") {
                $out .= $data->lower->{$ch} ?? $ch;
                continue;
            }
            $before = $i - 1;
            $after = $i + 1;
            while ($before >= 0 && self::inRanges(mb_ord($chars[$before], 'UTF-8'), $data->ignorableRanges)) {
                $before--;
            }
            while ($after < count($chars) && self::inRanges(mb_ord($chars[$after], 'UTF-8'), $data->ignorableRanges)) {
                $after++;
            }
            $out .= $before >= 0 && self::inRanges(mb_ord($chars[$before], 'UTF-8'), $data->casedRanges) && ($after === count($chars) || !self::inRanges(mb_ord($chars[$after], 'UTF-8'), $data->casedRanges)) ? 'ς' : 'σ';
        }
        return $out;
    }
    private static function upper(int $n) : bool
    {
        return $n >= 65 && $n <= 90 || $n >= 192 && $n <= 214 || $n >= 216 && $n <= 222;
    }
    private static function lowerBase(int $n) : bool
    {
        return $n >= 97 && $n <= 122 || $n >= 223 && $n <= 246 || $n >= 248 && $n <= 255;
    }
    private static function symbol(int $n) : bool
    {
        return $n >= 32 && $n <= 38 || $n >= 40 && $n <= 47 || $n >= 58 && $n <= 64 || $n >= 91 && $n <= 96 || $n >= 123 && $n <= 126 || $n >= 160 && $n <= 191 || $n === 215 || $n === 247;
    }
    public static function normalize(string $text) : string
    {
        $chars = mb_str_split($text, 1, 'UTF-8');
        $hasLower = false;
        $hasRoom = false;
        foreach ($chars as $ch) {
            $n = mb_ord($ch, 'UTF-8');
            $hasLower = $hasLower || self::lowerBase($n);
            $hasRoom = $hasRoom || self::symbol($n);
        }
        if (count($chars) && !$hasLower) {
            $text = self::lower($text);
            $chars = mb_str_split($text, 1, 'UTF-8');
        }
        if (!$hasRoom) {
            $text = '';
            for ($i = 0; $i < count($chars);) {
                $j = $i + 1;
                while ($j < count($chars) && self::upper(mb_ord($chars[$j], 'UTF-8'))) {
                    $j++;
                }
                $text .= $chars[$i];
                if (!self::upper(mb_ord($chars[$i], 'UTF-8')) && $j > $i + 1) {
                    $text .= ' ';
                    if ($j > $i + 2) {
                        $text .= implode('', array_slice($chars, $i + 1, $j - $i - 2)) . ' ';
                    }
                    $text .= $chars[$j - 1];
                    $i = $j;
                } else {
                    $i++;
                }
            }
        }
        $chars = mb_str_split(self::lower($text), 1, 'UTF-8');
        $out = '';
        for ($i = 0; $i < count($chars);) {
            if (self::symbol(mb_ord($chars[$i], 'UTF-8'))) {
                while ($i < count($chars) && self::symbol(mb_ord($chars[$i], 'UTF-8'))) {
                    $i++;
                }
                if ($i < count($chars)) {
                    $out .= '-' . $chars[$i++];
                }
            } else {
                $out .= $chars[$i++];
            }
        }
        return str_replace("'", '', $out);
    }
}
