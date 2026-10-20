"""Consumes the producer's exact bytes via Pydantic and normal public client sync."""
import json
import os
import copy
import pytest
from pathlib import Path
from vexilla_client.client import VexillaClient
from vexilla_client.scheduler import Scheduler


def test_shared_seed_bounds():
    root = Path(os.environ.get('VEXILLA_CONTRACT_DIR', '../../.contract-artifacts')).resolve()
    expected = json.loads((root / 'expected.json').read_text())
    original = json.loads((root / 'contract-group.json').read_text())
    client = VexillaClient('https://contract', 'dev', 'member')
    client.sync_manifest(lambda url: (root / 'manifest.json').read_text())
    for sample in expected['seedCases']:
        group = copy.deepcopy(original)
        group['environments']['dev']['features']['gradual']['seed'] = sample['value']
        fetch = lambda url: json.dumps(group)
        if sample['valid']:
            client.get_flags(expected['groupId'], fetch)
        else:
            with pytest.raises(ValueError, match='seed'):
                client.get_flags(expected['groupId'], fetch)


def test_shared_contract():
    root = Path(os.environ.get('VEXILLA_CONTRACT_DIR', '../../.contract-artifacts')).resolve()
    expected = json.loads((root / 'expected.json').read_text())
    def fetch(url):
        return (root / url.rsplit('/', 1)[-1]).read_text()
    for env in expected['environments']:
        for names in (False, True):
            client = VexillaClient('https://contract', env['name'] if names else env['id'], 'member')
            client.sync_manifest(fetch)
            group = expected['groupName'] if names else expected['groupId']
            decoded = client.get_flags(group, fetch)
            client.set_flags(decoded)
            assert decoded.features['gradual'].seed == 0.5
            assert decoded.environments[env['id']].features['gradual'].seed == env['seed']
            assert decoded.environments[env['id']].features['gradual'].value == env['threshold']
            for case in expected['cases']:
                feature = case['name'] if names else case['id']
                result = client.value(group, feature, 'fallback') if case['kind'] == 'value' else client.should_custom(group, feature, case['instance'])
                assert result == env[case['expectedKey']], (env['id'], feature, result)
            for feature in expected['scheduled'] + ['scheduled-active']:
                f = decoded.environments[env['id']].features[feature]
                assert Scheduler.is_schedule_active_with_now(f.schedule, f.schedule_type, expected['referenceClock']) == (feature == 'scheduled-active')
            for feature in expected['scheduled']:
                assert client.should(group, feature) is False
