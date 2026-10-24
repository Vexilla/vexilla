"""Consume the immutable corpus through production models, fetches and setters."""
import copy
import json
import os
from pathlib import Path
from urllib.parse import urlparse

import pytest
from pydantic import ValidationError
from vexilla_client.client import VexillaClient, FetchError
from vexilla_client.types import Manifest, Group, Schedule
from vexilla_client.scheduler import Scheduler
from vexilla_client.hasher import Hasher, instance_text, InvalidInstanceIdError
from vexilla_client.compat import normalize, timezone
from vexilla_client.validation import ContractValidationError
from vexilla_client.exceptions import (LookupTableError, NestedLookupTableError, GroupNotFoundError, InvalidShouldFeatureTypeError, InvalidValueFeatureTypeError)

pytestmark = pytest.mark.skipif(not os.environ.get("VEXILLA_CONTRACT_DIR"), reason="Use contract/scripts/run.cjs")


def outcome(fn):
    try:
        return {"value": fn()}
    except (ValidationError, ContractValidationError):
        return {"error": "validation"}
    except (LookupTableError, NestedLookupTableError, GroupNotFoundError):
        return {"error": "lookup"}
    except (InvalidShouldFeatureTypeError, InvalidValueFeatureTypeError):
        return {"error": "kind"}
    except InvalidInstanceIdError:
        return {"error": "instance"}
    except FetchError:
        return {"error": "fetch"}


def mutate(value, mutations):
    def keys(pointer):
        assert pointer.startswith("/")
        return [key.replace("~1", "/").replace("~0", "~") for key in pointer[1:].split("/")]
    def key(parent, token):
        return int(token) if isinstance(parent, list) else token
    def at(pointer):
        current = value
        for token in keys(pointer):
            current = current[key(current, token)]
        return current
    for mutation in mutations:
        tokens = keys(mutation["path"])
        parent = value
        for token in tokens[:-1]:
            parent = parent[key(parent, token)]
        target = key(parent, tokens[-1])
        if mutation["op"] == "remove":
            del parent[target]
        else:
            if mutation["op"] == "copy":
                item = copy.deepcopy(at(mutation["from"]))
            elif "wireString" in mutation:
                item = json.loads(mutation["wireString"])
            elif "nativeNumber" in mutation:
                item = float(mutation["nativeNumber"])
            else:
                item = copy.deepcopy(mutation["value"])
            if isinstance(parent, list) and target == len(parent):
                parent.append(item)
            else:
                parent[target] = item


def test_complete_production_contract():
    root = Path(os.environ["VEXILLA_CONTRACT_DIR"])
    def read(file):
        return json.loads((root / file).read_text())
    def fetch(url):
        return (root / urlparse(url).path.rsplit("/", 1)[-1]).read_text()
    expected, parity = read("expected.json"), read("parity.json")
    observations = []
    def observe(identifier, actual, wanted):
        assert actual == wanted, (identifier, actual, wanted)
        observations.append({"caseId": identifier, "outcome": actual})
    def client(environment="prod", instance="member"):
        return VexillaClient("https://contract", environment, instance)
    def installed(environment="prod"):
        result = client(environment)
        result.sync_manifest(fetch)
        result.sync_flags(expected["groupId"], fetch)
        return result
    for sample in parity["hashes"]:
        observe(sample["id"], {"value": Hasher.hash_fnv32a(sample["text"])}, sample["expected"])
    for sample in parity["numbers"]:
        text = instance_text(sample["instance"])
        observe(sample["id"], {"value": {"text": text, "hash": Hasher.hash_fnv32a(text)}}, sample["expected"])
    for sample in parity["gradual"]:
        c, group = client(), read("contract-group.json")
        c.sync_manifest(fetch)
        group["environments"]["prod"]["features"]["gradual"].update(seed=sample["seed"], value=sample["threshold"])
        c.set_flags(Group.parse_obj(group))
        observe(sample["id"], {"value": {"bucket": Hasher.hash_value(sample["instance"], sample["seed"]), "enabled": c.should_custom(expected["groupId"], "gradual", sample["instance"])}}, sample["expected"])
    for sample in parity["schedules"]:
        observe(sample["id"], {"value": Scheduler.is_schedule_active_with_now(Schedule.parse_obj(sample["schedule"]), sample["scheduleType"], sample["now"])}, sample["expected"])
    for sample in parity["validation"]:
        def validate(fetched):
            c = client()
            source = {"manifest": read("manifest.json"), "groups": {expected["groupId"]: read("contract-group.json")}}
            mutate(source, sample["mutations"])
            if fetched:
                c.sync_manifest(lambda _: json.dumps(source["manifest"]))
            else:
                c.set_manifest(Manifest.parse_obj(source["manifest"]))
            for identifier, group in source["groups"].items():
                if fetched:
                    c.sync_flags(identifier, lambda _: json.dumps(group))
                else:
                    c.set_flags(Group.parse_obj(group))
            return True
        direct, fetched = outcome(lambda: validate(False)), outcome(lambda: validate(True))
        assert direct == fetched, sample["id"]
        observe(sample["id"], direct, sample["expected"])
    for sample in parity["operations"]:
        clients, data, results = {}, {}, []
        for step in sample["steps"]:
            def execute():
                c = clients.get(step.get("client"))
                def callback(_):
                    if step["callback"].get("throws"):
                        raise RuntimeError("Deliberate transport failure")
                    return json.dumps(read(step["callback"]["file"]) if "file" in step["callback"] else data[step["callback"]["data"]])
                op = step["op"]
                if op == "load":
                    data[step["as"]] = read(step["file"])
                elif op == "new":
                    clients[step["client"]] = client(step["environment"], step["instance"])
                elif op == "mutate":
                    mutate(data[step["data"]], step["mutations"])
                elif op == "setManifest":
                    c.set_manifest(data[step["data"]] if isinstance(data[step["data"]], Manifest) else Manifest.parse_obj(data[step["data"]]))
                elif op == "setFlags":
                    c.set_flags(data[step["data"]] if isinstance(data[step["data"]], Group) else Group.parse_obj(data[step["data"]]))
                elif op == "getManifest":
                    data[step["as"]] = c.get_manifest(callback)
                elif op == "getFlags":
                    data[step["as"]] = c.get_flags(step["group"], callback)
                elif op == "syncManifest":
                    c.sync_manifest(callback)
                elif op == "syncFlags":
                    c.sync_flags(step["group"], callback)
                elif op == "should":
                    return c.should_custom(step["group"], step["feature"], step["instance"]) if step["instance"] is not None else c.should(step["group"], step["feature"])
                elif op == "value":
                    return c.value(step["group"], step["feature"], step["default"])
                else:
                    raise RuntimeError("Unknown operation: " + op)
            results.append(outcome(execute))
        observe(sample["id"], {"value": results}, sample["expected"])
    for sample in parity["aliases"]:
        observe(sample["id"], {"value": normalize(sample["name"])}, sample["expected"])
    for sample in parity["timezones"]:
        c, group = client(), read("contract-group.json")
        c.sync_manifest(fetch)
        group["features"]["toggle"]["schedule"]["timezone"] = sample["timezone"]
        result = outcome(lambda: c.set_flags(Group.parse_obj(group)))
        assert "error" not in result or result["error"] == "validation"
        observe(sample["id"], {"value": "error" not in result}, sample["expected"])
    for env in expected["environments"]:
        for mode in ("id", "name", "alias"):
            def name(identifier, label):
                return identifier if mode == "id" else label if mode == "name" else normalize(label)
            c, group = installed(name(env["id"], env["name"])), name(expected["groupId"], expected["groupName"])
            for index, sample in enumerate(expected["cases"]):
                feature = name(sample["id"], sample["name"])
                observe("publication/{}/{}/{}".format(env["id"], mode, index), outcome(lambda: c.value(group, feature, "fallback") if sample["kind"] == "value" else c.should_custom(group, feature, sample["instance"])), {"value": env[sample["expectedKey"]]})
            decoded = read("contract-group.json")
            for identifier in expected["scheduled"] + ["scheduled-active"]:
                f = decoded["environments"][env["id"]]["features"][identifier]
                observe("publication/{}/{}/schedule/{}".format(env["id"], mode, identifier), {"value": Scheduler.is_schedule_active_with_now(Schedule.parse_obj(f["schedule"]), f["scheduleType"], expected["referenceClock"])}, {"value": identifier == "scheduled-active"})
    assert len({item["caseId"] for item in observations}) == len(observations)
    if os.environ.get("VEXILLA_OBSERVATIONS_FILE"):
        Path(os.environ["VEXILLA_OBSERVATIONS_FILE"]).write_text(json.dumps({"protocol": 1, "sdk": "python", "runs": [{"runtime": "native", "observations": observations}]}, allow_nan=False))


def test_mutated_native_models_cannot_bypass_setter_validation_or_change_snapshots():
    root = Path(os.environ["VEXILLA_CONTRACT_DIR"])
    c = VexillaClient("https://contract", "prod", "member")
    c.set_manifest(Manifest.parse_raw((root / "manifest.json").read_text()))
    model = Group.parse_raw((root / "contract-group.json").read_text())
    c.set_flags(model)
    model.environments["prod"].features["toggle"].value = False
    assert c.should("contract-group", "toggle") is True
    model.environments["prod"].features["gradual"].seed = False
    with pytest.raises(ContractValidationError, match="seed"):
        c.set_flags(model)
    assert c.should("contract-group", "toggle") is True
    for instance in (None, True, False, float("inf"), float("nan"), 9007199254740993, "\ud800", "\udfff", "x\ud800y"):
        with pytest.raises(InvalidInstanceIdError):
            c.should_custom("contract-group", "gradual", instance)
