from typing import Dict, Union, Callable
import json

from .hasher import Hasher
from .scheduler import Scheduler
from .types import Group, Feature, Manifest, FeatureType
from .exceptions import GroupNotFoundError, LookupTableError, NestedLookupTableError, InvalidShouldFeatureTypeError, InvalidValueFeatureTypeError

class VexillaClient:
    __manifest: Manifest
    __flag_groups: Dict[str, Group] = {}

    __group_lookup_table: Dict[str, str] = {}
    __environment_lookup_table: Dict[str, Dict[str, str]] = {}
    __feature_lookup_table: Dict[str, Dict[str, str]] = {}

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


    def get_manifest(self, fetch: Callable[[str], str]) -> Manifest:
        url = f"{self.base_url}/manifest.json"
        raw_manifest = fetch(url)
        return Manifest.parse_raw(raw_manifest)

    def set_manifest(self, manifest: Manifest) -> None:
        self.__manifest = manifest

        for group in manifest.groups:
            self.__group_lookup_table[group.group_id] = group.group_id
            self.__group_lookup_table[group.name] = group.group_id

    def sync_manifest(self, fetch: Callable[[str], str]) -> None:
        manifest = self.get_manifest(fetch)
        self.set_manifest(manifest)

    def get_flags(self, group_name_or_id: str, fetch: Callable[[str], str]) -> Group:
        try:
            group_id = self.__group_lookup_table[group_name_or_id]
        except Exception as e:
            raise LookupTableError("group", group_name_or_id, [e])
        url = f"{self.base_url}/{group_id}.json"
        raw_flag_group = fetch(url)
        return Group.parse_raw(raw_flag_group)


    def set_flags(self, group_name_or_id: str, group: Group) -> None:
        try:
            group_id = self.__group_lookup_table[group_name_or_id]
        except Exception as e:
            raise LookupTableError("group", group_name_or_id, [e])

        if group_id not in self.__environment_lookup_table:
            self.__environment_lookup_table[group_id] = {}

        for environment_id, environment in group.environments.items():
            self.__environment_lookup_table[group_id][environment_id] = environment_id
            self.__environment_lookup_table[group_id][environment.name] = environment_id

        if group_id not in self.__feature_lookup_table:
            self.__feature_lookup_table[group_id] = {}

        for feature_id, feature in group.features.items():
            self.__feature_lookup_table[group_id][feature_id] = feature_id
            self.__feature_lookup_table[group_id][feature.name] = feature_id

        self.__flag_groups[group_id] = group

    def sync_flags(self, group_name_or_id: str, fetch: Callable[[str], str]) -> None:
        flag_group = self.get_flags(fetch)
        self.set_flags(group_name_or_id, flag_group)

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

        if not Scheduler.is_scheduled_feature_active(feature):
            return False

        if feature.feature_type is FeatureType.TOGGLE:
            return feature.value
        elif feature.feature_type is FeatureType.GRADUAL:
            return Hasher.hash_value(custom_instance_id, feature.seed) <= feature.value
        elif feature.feature_type is FeatureType.SELECTIVE:
            return custom_instance_id in feature.value
        else:
            raise InvalidShouldFeatureTypeError(feature.feature_id, feature.feature_type)

    def value(self, group_name_or_id: str,
        feature_name_or_id: str, default_value: Union[str, int, float]) -> Union[str, int, float]:

        feature = self.__get_feature(group_name_or_id, feature_name_or_id)

        if not Scheduler.is_scheduled_feature_active(feature):
            return default_value

        if feature.feature_type is FeatureType.VALUE:
            raise InvalidValueFeatureTypeError(feature.feature_id, feature.feature_type)

        return feature.value

    def __get_feature(self, group_name_or_id: str, feature_name_or_id: str) -> Feature:
        try:
            group_id = self.__group_lookup_table[group_name_or_id]
        except Exception as e:
            raise LookupTableError("group", group_name_or_id, [e])

        try:
            feature_id = self.__feature_lookup_table[group_name_or_id]
        except Exception as e:
            raise NestedLookupTableError("feature", group_id, group_name_or_id, [e])

        try:
            environment_id = self.__environment_lookup_table[group_name_or_id]
        except Exception as e:
            raise NestedLookupTableError("environment", group_id, self.__environment, [e])

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