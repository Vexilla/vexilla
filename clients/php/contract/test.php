<?php

declare (strict_types=1);
require __DIR__ . '/../vendor/autoload.php';
use Vexilla\{Client, Codec, Hasher, Scheduler, Compatibility, ContractException};
$dir = getenv('VEXILLA_CONTRACT_DIR') ?: __DIR__ . '/../../../.contract-artifacts';
function readFixture(string $name)
{
    global $dir;
    return json_decode(file_get_contents($dir . '/' . $name), false, 512, JSON_THROW_ON_ERROR);
}
function cloneData($v)
{
    if (is_object($v)) {
        $copy = clone $v;
        foreach ($copy as $k => $item) {
            $copy->{$k} = cloneData($item);
        }
        return $copy;
    }
    if (is_array($v)) {
        return array_map('cloneData', $v);
    }
    return $v;
}
function &pointer(&$v, array $keys)
{
    if (!$keys) {
        return $v;
    }
    $key = array_shift($keys);
    if (is_array($v)) {
        return pointer($v[(int) $key], $keys);
    }
    return pointer($v->{$key}, $keys);
}
function tokens(string $p) : array
{
    return array_map(function ($s) {
        return str_replace(['~1', '~0'], ['/', '~'], $s);
    }, explode('/', substr($p, 1)));
}
function mutate(&$v, array $mutations) : void
{
    foreach ($mutations as $m) {
        $keys = tokens($m->path);
        $key = array_pop($keys);
        $parent =& pointer($v, $keys);
        if ($m->op === 'remove') {
            if (is_array($parent)) {
                array_splice($parent, (int) $key, 1);
            } else {
                unset($parent->{$key});
            }
        } else {
            if ($m->op === 'copy') {
                $item = cloneData(pointer($v, tokens($m->from)));
            } elseif (property_exists($m, 'wireString')) {
                $item = json_decode($m->wireString, false, 512, JSON_THROW_ON_ERROR);
            } elseif (property_exists($m, 'nativeNumber')) {
                $item = ['NaN' => NAN, 'Infinity' => INF, '-Infinity' => -INF][$m->nativeNumber];
            } else {
                $item = cloneData($m->value);
            }
            if (is_array($parent)) {
                $parent[(int) $key] = $item;
            } else {
                $parent->{$key} = $item;
            }
        }
        unset($parent);
    }
}
function outcome(callable $fn) : object
{
    try {
        return (object) ['value' => $fn()];
    } catch (ContractException $e) {
        return (object) ['error' => $e->kind];
    } catch (JsonException $e) {
        return (object) ['error' => 'validation'];
    }
}
function same($a, $b) : bool
{
    if ((is_int($a) || is_float($a)) && (is_int($b) || is_float($b))) {
        return (float) $a === (float) $b;
    }
    if (is_object($a) && is_object($b)) {
        $x = get_object_vars($a);
        $y = get_object_vars($b);
        ksort($x);
        ksort($y);
        if (array_keys($x) !== array_keys($y)) {
            return false;
        }
        foreach ($x as $k => $v) {
            if (!same($v, $y[$k])) {
                return false;
            }
        }
        return true;
    }
    if (is_array($a) && is_array($b)) {
        if (count($a) !== count($b)) {
            return false;
        }
        foreach ($a as $k => $v) {
            if (!same($v, $b[$k])) {
                return false;
            }
        }
        return true;
    }
    return $a === $b;
}
$observations = [];
function observe(string $id, $got, $want) : void
{
    global $observations;
    if (!same($got, $want)) {
        throw new RuntimeException($id . ' expected ' . json_encode($want) . ' actual ' . json_encode($got));
    }
    $observations[] = (object) ['caseId' => $id, 'outcome' => $got];
}
function value($v) : object
{
    return (object) ['value' => $v];
}
$expected = readFixture('expected.json');
$parity = readFixture('parity.json');
$fetch = function ($url) {
    return readFixture(basename($url));
};
foreach ($parity->hashes as $s) {
    observe($s->id, value(Hasher::hashFnv32a($s->text)), $s->expected);
}
foreach ($parity->numbers as $s) {
    $text = Hasher::instanceText($s->instance);
    observe($s->id, value((object) ['text' => $text, 'hash' => Hasher::hashFnv32a($text)]), $s->expected);
}
foreach ($parity->gradual as $s) {
    $c = new Client('https://contract', 'prod', 'member');
    $c->syncManifest($fetch);
    $g = readFixture('contract-group.json');
    $g->environments->prod->features->gradual->seed = $s->seed;
    $g->environments->prod->features->gradual->value = $s->threshold;
    $c->setFlags(Codec::group($g));
    observe($s->id, value((object) ['bucket' => Hasher::hashString(Hasher::instanceText($s->instance), $s->seed), 'enabled' => $c->shouldCustom($expected->groupId, 'gradual', $s->instance)]), $s->expected);
}
foreach ($parity->schedules as $s) {
    observe($s->id, value(Scheduler::isScheduleActiveMillis(\Vexilla\Types\Schedule::fromRaw($s->schedule), $s->scheduleType, $s->now)), $s->expected);
}
foreach ($parity->validation as $s) {
    $results = [];
    foreach ([false, true] as $fetched) {
        $results[] = outcome(function () use($s, $expected, $fetched) {
            $c = new Client('https://contract', 'prod', 'member');
            $source = (object) ['manifest' => readFixture('manifest.json'), 'groups' => (object) [$expected->groupId => readFixture('contract-group.json')]];
            mutate($source, $s->mutations);
            if ($fetched) {
                $c->syncManifest(function () use($source) {
                    return $source->manifest;
                });
            } else {
                $c->setManifest(Codec::manifest($source->manifest));
            }
            foreach ($source->groups as $id => $group) {
                if ($fetched) {
                    $c->syncFlags($id, function () use($group) {
                        return $group;
                    });
                } else {
                    $c->setFlags(Codec::group($group));
                }
            }
            return true;
        });
    }
    if (!same($results[0], $results[1])) {
        throw new RuntimeException('Ingestion paths differ: ' . $s->id);
    }
    observe($s->id, $results[0], $s->expected);
}
foreach ($parity->operations as $s) {
    $clients = [];
    $data = [];
    $results = [];
    foreach ($s->steps as $step) {
        $results[] = outcome(function () use($step, &$clients, &$data) {
            $c = $clients[$step->client ?? ''] ?? null;
            $callback = function () use($step, &$data) {
                $cb = $step->callback;
                if ($cb->throws ?? false) {
                    throw new RuntimeException('Transport failure');
                }
                return isset($cb->file) ? readFixture($cb->file) : $data[$cb->data];
            };
            switch ($step->op) {
                case 'load':
                    $data[$step->as] = readFixture($step->file);
                    break;
                case 'new':
                    $clients[$step->client] = new Client('https://contract', $step->environment, $step->instance ?? null);
                    break;
                case 'mutate':
                    mutate($data[$step->data], $step->mutations);
                    break;
                case 'setManifest':
                    $c->setManifest(Codec::manifest($data[$step->data]));
                    break;
                case 'setFlags':
                    $c->setFlags(Codec::group($data[$step->data]));
                    break;
                case 'getManifest':
                    $data[$step->as] = Codec::wire($c->getManifest($callback));
                    break;
                case 'getFlags':
                    $data[$step->as] = Codec::wire($c->getFlags($step->group, $callback));
                    break;
                case 'syncManifest':
                    $c->syncManifest($callback);
                    break;
                case 'syncFlags':
                    $c->syncFlags($step->group, $callback);
                    break;
                case 'should':
                    return property_exists($step, 'instance') ? $c->shouldCustom($step->group, $step->feature, $step->instance) : $c->should($step->group, $step->feature);
                case 'value':
                    return $c->value($step->group, $step->feature, $step->default);
                default:
                    throw new RuntimeException('Unknown operation');
            }
            return null;
        });
    }
    observe($s->id, value($results), $s->expected);
}
foreach ($parity->aliases as $s) {
    observe($s->id, value(Compatibility::normalize($s->name)), $s->expected);
}
foreach ($parity->timezones as $s) {
    $c = new Client('https://contract', 'prod', 'member');
    $c->syncManifest($fetch);
    $g = readFixture('contract-group.json');
    $g->features->toggle->schedule->timezone = $s->timezone;
    $r = outcome(function () use($c, $g) {
        $c->setFlags(Codec::group($g));
        return true;
    });
    observe($s->id, value(property_exists($r, 'value')), $s->expected);
}
foreach ($expected->environments as $env) {
    foreach (['id', 'name', 'alias'] as $lookup) {
        $name = function ($id, $label) use($lookup) {
            return $lookup === 'id' ? $id : ($lookup === 'name' ? $label : Compatibility::normalize($label));
        };
        $c = new Client('https://contract', $name($env->id, $env->name), 'member');
        $c->syncManifest($fetch);
        $c->syncFlags($expected->groupId, $fetch);
        $group = $name($expected->groupId, $expected->groupName);
        foreach ($expected->cases as $index => $sample) {
            $fid = $name($sample->id, $sample->name);
            observe('publication/' . $env->id . '/' . $lookup . '/' . $index, outcome(function () use($c, $sample, $group, $fid) {
                return $sample->kind === 'value' ? $c->value($group, $fid, 'fallback') : $c->shouldCustom($group, $fid, $sample->instance);
            }), value($env->{$sample->expectedKey}));
        }
        $decoded = Codec::group(readFixture('contract-group.json'));
        foreach (array_merge($expected->scheduled, ['scheduled-active']) as $id) {
            $f = $decoded->environments[$env->id]->features[$id];
            observe('publication/' . $env->id . '/' . $lookup . '/schedule/' . $id, value(Scheduler::isScheduleActiveMillis($f->schedule, $f->scheduleType, $expected->referenceClock)), value($id === 'scheduled-active'));
        }
    }
}
// Exercise actual native mutable models at setter boundaries, without adapter copies.
$c = new Client('https://contract', 'prod', 'member');
$c->syncManifest($fetch);
$g = $c->getFlags('contract-group', $fetch);
$c->setFlags($g);
$g->environments['prod']->features['toggle']->value = false;
if (!$c->should('contract-group', 'toggle')) {
    throw new RuntimeException('Caller mutation changed installed snapshot');
}
$g = $c->getFlags('contract-group', $fetch);
$g->environments['prod']->features['value-float']->value = NAN;
$r = outcome(function () use($c, $g) {
    $c->setFlags($g);
});
if (($r->error ?? null) !== 'validation' || !$c->should('contract-group', 'toggle')) {
    throw new RuntimeException('Nonfinite setter was not atomic');
}
foreach ([null, true, NAN, INF, 9007199254740993, "í €", "\xff"] as $bad) {
    $r = outcome(function () use($c, $bad) {
        return $c->shouldCustom('contract-group', 'gradual', $bad);
    });
    if (($r->error ?? null) !== 'instance') {
        throw new RuntimeException('Invalid native ID accepted');
    }
}
foreach (['\\ud800', '\\udfff', '\\ud800x'] as $bad) {
    $r = outcome(function () use($c, $bad) {
        return $c->getManifest(function () use($bad) {
            return '{"version":"v1","groups":[],"extra":"' . $bad . '"}';
        });
    });
    if (($r->error ?? null) !== 'validation') {
        throw new RuntimeException('Malformed raw JSON Unicode accepted');
    }
}
$file = getenv('VEXILLA_OBSERVATIONS_FILE');
if ($file) {
    file_put_contents($file, json_encode(['protocol' => 1, 'sdk' => 'php', 'runs' => [['runtime' => 'native', 'observations' => $observations]]], JSON_THROW_ON_ERROR));
}
echo 'Shared PHP contract passed: ' . count($observations) . " observations\n";
