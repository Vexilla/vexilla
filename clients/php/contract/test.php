<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';
use Vexilla\Client;
$dir = getenv('VEXILLA_CONTRACT_DIR');
if (!$dir) {
  throw new RuntimeException('Generate shared contract artifacts first');
}
$expected = json_decode(file_get_contents($dir.'/expected.json'), true, 512, JSON_THROW_ON_ERROR);
$fetch = function($url) use ($dir) { return json_decode(file_get_contents($dir.'/'.basename($url)), false, 512, JSON_THROW_ON_ERROR); };
$check = function($got,$want,$field) {
  if ($got !== $want && !(is_numeric($got) && is_numeric($want) && (float)$got === (float)$want)) {
    throw new RuntimeException('Contract mismatch '.$field.': '.json_encode([$got,$want]));
  }
};
foreach ($expected['seedCases'] as $sample) {
  $group = json_decode(file_get_contents($dir.'/contract-group.json'), false, 512, JSON_THROW_ON_ERROR);
  $group->environments->dev->features->gradual->seed = $sample['value'];
  $accepted = true;
  try {
    $client = new Client('https://contract', 'dev', 'member');
    $client->syncManifest($fetch);
    $client->getFlags('contract-group', function($url) use ($group) { return $group; });
  } catch (\Throwable $error) {
    $accepted = false;
  }
  $check($accepted, $sample['valid'], 'seed '.json_encode($sample['value']));
}
foreach ($expected['environments'] as $env) {
  foreach ([false,true] as $names) {
    $client = new Client('https://contract',$env[$names ? 'name' : 'id'],'member');
    $client->syncManifest($fetch);
    $group=$expected[$names ? 'groupName' : 'groupId'];
    $decoded=$client->getFlags($group,$fetch);
    $check($decoded->environments[$env['id']]->features['gradual']->seed,$env['seed'],'seed');
    $check($decoded->environments[$env['id']]->features['gradual']->value,$env['threshold'],'threshold');
    foreach (array_merge($expected['scheduled'],['scheduled-active']) as $fid) {
      $f=$decoded->environments[$env['id']]->features[$fid];
      $check(\Vexilla\Scheduler::isScheduleActiveWithNow($f->schedule,$f->scheduleType,\Carbon\Carbon::createFromTimestampMsUTC($expected['referenceClock'])),$fid==='scheduled-active','reference clock: '.$fid);
    }
    $client->setFlags($decoded);
    foreach ($expected['cases'] as $case) {
      $fid=$case[$names ? 'name' : 'id'];$key=$case['expectedKey'];
      if ($case['kind']==='value') {
        $method=['string'=>'valueString','int'=>'valueInt','float'=>'valueFloat'][$key];
        $got=$client->$method($group,$fid,$key==='string'?'fallback':-1);
      } else {
        $method=is_string($case['instance'])?'shouldCustomString':($case['id']==='selective-int'?'shouldCustomInt':'shouldCustomFloat');
        $got=$client->$method($group,$fid,$case['instance']);
      }
      $check($got,$env[$key],$fid);
    }
    foreach ($expected['scheduled'] as $fid) {
      $check($client->should($group,$fid),false,$fid);
    }
  }
}
echo "Shared PHP contract passed\n";
