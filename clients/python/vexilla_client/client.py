import logging
from functools import wraps
from typing import Dict, Union, Callable
import json

from .hasher import Hasher, instance_text
from . import validation
from .compat import normalize
from .scheduler import Scheduler
from .types import Group, Feature, Manifest, FeatureType
from .exceptions import (
    GroupNotFoundError,
    LookupTableError,
    NestedLookupTableError,
    InvalidShouldFeatureTypeError,
    InvalidValueFeatureTypeError,
)

_logger = logging.getLogger(__name__)


def _diagnose_operation(operation):
    def decorate(method):
        @wraps(method)
        def execute(client, *arguments, **keyword_arguments):
            try:
                result = method(client, *arguments, **keyword_arguments)
            except Exception:
                client._report_operation(operation, succeeded=False)
                raise
            client._report_operation(operation, succeeded=True)
            return result

        return execute

    return decorate


class FetchError(ValueError):
    pass


class VexillaClient:
    def __init__(
        self,
        base_url: str,
        environment: str,
        custom_instance_id: str,
        show_logs: bool = False,
    ):
        super().__init__()
        self.__base_url = base_url
        self.__environment = environment
        self.__custom_instance_id = custom_instance_id
        self.__show_logs = show_logs
        self.__manifest = None
        self.__flag_groups = {}
        self.__group_lookup_table = {}
        self.__environment_lookup_table = {}
        self.__feature_lookup_table = {}

    def _report_operation(self, operation, succeeded):
        if not self.__show_logs:
            return
        outcome = "success" if succeeded else "failure"
        log = _logger.info if succeeded else _logger.warning
        log("vexilla operation=%s outcome=%s", operation, outcome)

    @_diagnose_operation("manifest.fetch")
    def get_manifest(self, fetch: Callable[[str], str]) -> Manifest:
        try:
            raw = fetch(f"{self.__base_url}/manifest.json")
        except Exception as error:
            raise FetchError("Failed to fetch manifest") from error
        return Manifest.parse_raw(raw)

    @_diagnose_operation("manifest.install")
    def set_manifest(self, manifest: Manifest) -> None:
        manifest_data = validation.wire(manifest)
        group_aliases = validation.manifest(manifest_data)
        manifest_snapshot = Manifest.parse_obj(manifest_data)
        manifest_entries = {
            group.group_id: group.name for group in manifest_snapshot.groups
        }
        for group_id, installed_group in list(self.__flag_groups.items()):
            if manifest_entries.get(group_id) != installed_group.name:
                del self.__flag_groups[group_id]
                self.__feature_lookup_table.pop(group_id, None)
                self.__environment_lookup_table.pop(group_id, None)
        self.__manifest = manifest_snapshot
        self.__group_lookup_table = group_aliases

    def sync_manifest(self, fetch: Callable[[str], str]) -> None:
        self.set_manifest(self.get_manifest(fetch))

    @_diagnose_operation("group.fetch")
    def get_flags(self, group_name_or_id: str, fetch: Callable[[str], str]) -> Group:
        if group_name_or_id not in self.__group_lookup_table:
            raise LookupTableError("group", group_name_or_id, [])
        group_id = self.__group_lookup_table[group_name_or_id]
        try:
            raw = fetch(f"{self.__base_url}/{group_id}.json")
        except Exception as error:
            raise FetchError("Failed to fetch group") from error
        group = Group.parse_raw(raw)
        validation.group(group, validation.wire(self.__manifest)["groups"])
        validation.require(group.group_id == group_id, "groupId", "the requested group")
        return group

    @_diagnose_operation("group.install")
    def set_flags(self, group: Group) -> None:
        if self.__manifest is None:
            raise LookupTableError("group", "manifest", [])
        group_data = validation.wire(group)
        feature_aliases, environment_aliases = validation.group(
            group_data, validation.wire(self.__manifest)["groups"]
        )
        group_snapshot = Group.parse_obj(group_data)
        self.__flag_groups[group_snapshot.group_id] = group_snapshot
        self.__feature_lookup_table[group_snapshot.group_id] = feature_aliases
        self.__environment_lookup_table[group_snapshot.group_id] = environment_aliases

    def sync_flags(self, group_name_or_id: str, fetch: Callable[[str], str]) -> None:
        self.set_flags(self.get_flags(group_name_or_id, fetch))

    def should(self, group_name_or_id: str, feature_name_or_id: str) -> bool:
        return self.should_custom(
            group_name_or_id, feature_name_or_id, self.__custom_instance_id
        )

    def should_custom(
        self,
        group_name_or_id: str,
        feature_name_or_id: str,
        custom_instance_id: Union[str, int, float],
    ) -> bool:
        feature = self.__get_feature(group_name_or_id, feature_name_or_id)

        if feature.feature_type is FeatureType.VALUE:
            raise InvalidShouldFeatureTypeError(
                feature.feature_id, feature.feature_type, []
            )
        if feature.feature_type in (FeatureType.GRADUAL, FeatureType.SELECTIVE):
            instance_text(custom_instance_id)
        if not Scheduler.is_scheduled_feature_active(feature):
            return False
        if feature.feature_type is FeatureType.TOGGLE:
            return feature.value
        if feature.feature_type is FeatureType.GRADUAL:
            return Hasher.hash_value(custom_instance_id, feature.seed) < feature.value
        return any(
            (
                isinstance(value, str)
                and isinstance(custom_instance_id, str)
                or type(value) in (int, float)
                and type(custom_instance_id) in (int, float)
            )
            and value == custom_instance_id
            for value in feature.value
        )

    def value(
        self,
        group_name_or_id: str,
        feature_name_or_id: str,
        default_value: Union[str, int, float],
    ) -> Union[str, int, float]:
        feature = self.__get_feature(group_name_or_id, feature_name_or_id)

        if feature.feature_type is not FeatureType.VALUE:
            raise InvalidValueFeatureTypeError(
                feature.feature_id, feature.feature_type, []
            )
        if not Scheduler.is_scheduled_feature_active(feature):
            return default_value

        return feature.value

    def __get_feature(self, group_name_or_id: str, feature_name_or_id: str) -> Feature:
        try:
            group_id = self.__group_lookup_table[group_name_or_id]
        except Exception as e:
            raise LookupTableError("group", group_name_or_id, [e])

        try:
            feature_id = self.__feature_lookup_table[group_id][feature_name_or_id]
        except Exception as e:
            raise NestedLookupTableError("feature", group_id, feature_name_or_id, [e])

        try:
            environment_id = self.__environment_lookup_table[group_id][
                self.__environment
            ]
        except Exception as e:
            raise NestedLookupTableError(
                "environment", group_id, self.__environment, [e]
            )

        try:
            group = self.__flag_groups[group_id]
        except Exception as e:
            raise GroupNotFoundError(group_id, [e])

        try:
            environment = group.environments[environment_id]
        except Exception as e:
            raise GroupNotFoundError(group_id, [e])

        try:
            feature = environment.features[feature_id]
        except Exception as e:
            raise GroupNotFoundError(group_id, [e])

        return feature
