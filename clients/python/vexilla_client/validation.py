"""Noncoercing v1 boundary checks. Additional JSON properties remain compatible."""
import math
from enum import Enum
from .compat import normalize, timezone


class ContractValidationError(ValueError):
    pass


def wire(value):
    # A model passed to a public setter is revalidated, including construct() and
    # later mutations. Keep native NaN/bool/list distinctions; do not encode JSON.
    if hasattr(value, "dict"):
        return wire(value.dict(by_alias=True))
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {key: wire(item) for key, item in value.items()}
    if isinstance(value, list):
        return [wire(item) for item in value]
    return value


def require(condition, path, expected):
    if not condition:
        raise ContractValidationError(path + ": expected " + expected)


def object_(value, path):
    unicode_tree(value, path)
    require(isinstance(value, dict) and all(isinstance(key, str) for key in value), path, "an object")


def unicode_tree(value, path=""):
    if isinstance(value, str):
        require(not any(0xd800 <= ord(char) <= 0xdfff for char in value), path, "Unicode without unpaired surrogates")
    elif isinstance(value, dict):
        for key, item in value.items():
            unicode_tree(key, path)
            unicode_tree(item, path + "/" + str(key))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            unicode_tree(item, path + "/" + str(index))


def text(value, path, nonempty=False):
    require(isinstance(value, str) and (not nonempty or bool(value)), path, "a nonempty string" if nonempty else "a string")


def number(value, path, integer=False):
    require(type(value) in (int, float), path, "a finite number")
    try:
        finite = math.isfinite(value)
    except OverflowError:
        finite = False
    require(finite, path, "a finite number")
    if integer:
        require(-9007199254740991 <= value <= 9007199254740991 and value % 1 == 0, path, "a safe integer")


def safe_id(value):
    text(value, "groupId", True)
    require(value not in ("manifest", "config", ".", "..") and not any(char in value for char in ("/", "\\", "\0")), "groupId", "a safe group file identifier")


def same_identity_field(a, b, field):
    if (field in a) != (field in b):
        return False
    if field not in a:
        return True
    left, right = a[field], b[field]
    if type(left) in (dict, list) or type(right) in (dict, list):
        return False
    if type(left) in (int, float) and type(right) in (int, float):
        return float(left) == float(right)
    return type(left) is type(right) and left == right


def aliases(items):
    result = {}
    for identifier, name in items:
        for key in (identifier, name, normalize(name)):
            require(key not in result or result[key] == identifier, "name", "an unambiguous alias")
            result[key] = identifier
    return result


def schedule(value):
    object_(value, "schedule")
    for field in ("start", "end", "startTime", "endTime"):
        number(value.get(field), "schedule/" + field, True)
    require(value.get("timeType") in ("none", "start/end", "daily"), "schedule/timeType", "a supported time type")
    require(timezone(value.get("timezone")), "schedule/timezone", "a compatible timezone identifier")


def feature(value):
    object_(value, "feature")
    text(value.get("name"), "feature/name")
    text(value.get("featureId"), "feature/featureId", True)
    require(value.get("scheduleType") in ("", "global", "environment"), "scheduleType", "a supported schedule type")
    schedule(value.get("schedule"))
    kind = value.get("featureType")
    require(kind in ("toggle", "gradual", "selective", "value"), "featureType", "an existing feature type")
    if kind == "toggle":
        require(type(value.get("value")) is bool, "value", "a boolean")
    elif kind == "gradual":
        number(value.get("value"), "value")
        number(value.get("seed"), "seed")
        require(0 < value["seed"] <= 1, "seed", "0 < seed <= 1")
    else:
        require(value.get("valueType") in ("string", "number"), "valueType", "string or number")
        if value["valueType"] == "number":
            require(value.get("numberType") in ("int", "float"), "numberType", "int or float")
        values = [value.get("value")]
        if kind == "selective":
            require(isinstance(value.get("value"), list), "value", "an array")
            values = value["value"]
        for item in values:
            if value["valueType"] == "string":
                text(item, "value")
            else:
                number(item, "value", value["numberType"] == "int")


def features(value):
    object_(value, "features")
    for identifier, item in value.items():
        feature(item)
        require(identifier == item["featureId"], "featureId", "the map key")
    return aliases((identifier, item["name"]) for identifier, item in value.items())


def manifest(value):
    value = wire(value)
    object_(value, "manifest")
    require(value.get("version") == "v1", "version", "v1")
    require(isinstance(value.get("groups"), list), "groups", "an array")
    seen = set()
    for item in value["groups"]:
        object_(item, "manifest/group")
        safe_id(item.get("groupId"))
        text(item.get("name"), "manifest/group/name")
        require(item["groupId"] not in seen, "groupId", "a unique group ID")
        seen.add(item["groupId"])
    return aliases((item["groupId"], item["name"]) for item in value["groups"])


def group(value, entries=None):
    value = wire(value)
    object_(value, "group")
    safe_id(value.get("groupId"))
    text(value.get("name"), "group/name")
    object_(value.get("meta"), "meta")
    require(value["meta"].get("version") == "v1", "meta/version", "v1")
    if entries is not None:
        require(any(item["groupId"] == value["groupId"] and item["name"] == value["name"] for item in entries), "group", "the manifest ID and name")
    feature_aliases = features(value.get("features"))
    object_(value.get("environments"), "environments")
    envs = value["environments"]
    for identifier, env in envs.items():
        object_(env, "environment")
        text(env.get("name"), "environment/name")
        text(env.get("environmentId"), "environmentId", True)
        require(env["environmentId"] == identifier, "environmentId", "the map key")
        features(env.get("features"))
        require(env["features"].keys() == value["features"].keys(), "environment/features", "the exact group feature set")
        for fid, item in env["features"].items():
            require(all(same_identity_field(item, value["features"][fid], field) for field in ("name", "featureType", "valueType", "numberType")), "feature", "the group feature name and subtype")
    return feature_aliases, aliases((identifier, env["name"]) for identifier, env in envs.items())
