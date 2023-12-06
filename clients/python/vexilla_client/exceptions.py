from .types import FeatureType


class LookupTableError(Exception):
    def __init__(self, table_name: str, name_or_id: str, errors) -> None:
        super().__init__(
            f"No value found in {table_name}_lookup_table for key: {name_or_id}. This could indicate a misspelling or you haven't fetched the manifest or flag group, yet."
        )
        self.table_name = table_name
        self.name_or_id = name_or_id
        self.errors = errors

    def __reduce__(self):
        return (LookupTableError, (self.table_name, self.name_or_id, self.errors))


class NestedLookupTableError(Exception):
    def __init__(self, table_name: str, group_id: str, name_or_id: str, errors) -> None:
        super().__init__(
            f"No value found in {table_name}_lookup_table for groupId: {group_id} and key: {name_or_id}. This could indicate a misspelling or you haven't fetched the manifest or flag group, yet."
        )
        self.table_name = table_name
        self.group_id = group_id
        self.name_or_id = name_or_id
        self.errors = errors

    def __reduce__(self):
        return (
            LookupTableError,
            (self.table_name, self.group_id, self.name_or_id, self.errors),
        )


class GroupNotFoundError(Exception):
    def __init__(self, group_id: str, errors) -> None:
        super().__init__(
            f"The group with id, {group_id}, was not found. This is likely because it has not been fetched and stored with get_flags/set_flags or sync_flags, yet."
        )
        self.group_id = group_id
        self.errors = errors

    def __reduce__(self):
        return (GroupNotFoundError, (self.group_id, self.errors))


class EnvironmentNotFoundError(Exception):
    def __init__(self, group_id: str, environment_id: str, errors) -> None:
        super().__init__(
            f"The environment with id, {environment_id}, was not found within the group with id, {group_id}. Make sure that the Environment exists within the Group in your flag config."
        )
        self.group_id = group_id
        self.environment_id = environment_id
        self.errors = errors

    def __reduce__(self):
        return (
            EnvironmentNotFoundError,
            (self.group_id, self.environment_id, self.errors),
        )


class FeatureNotFoundError(Exception):
    def __init__(
        self, group_id: str, environment_id: str, feature_id: str, errors
    ) -> None:
        super().__init__(
            f"The feature with id, {feature_id}, was not found within the environment with id, {environment_id}, within the group with id, {group_id}. Make sure that the Feature exists within the Group in your flag config."
        )
        self.group_id = group_id
        self.environment_id = environment_id
        self.feature_id = feature_id
        self.errors = errors

    def __reduce__(self):
        return (
            FeatureNotFoundError,
            (self.group_id, self.environment_id, self.feature_id, self.errors),
        )


class InvalidShouldFeatureTypeError(Exception):
    def __init__(self, feature_id: str, feature_type: FeatureType, errors) -> None:
        super().__init__(
            f"The feature with id, {feature_id}, was not an appropriate feature type for the should function. It's type was {feature_type}. In most cases, this will happen if the feature type is Value, so instead use the 'value' method."
        )
        self.feature_id = feature_id
        self.feature_type = feature_type
        self.errors = errors

    def __reduce__(self):
        return (
            InvalidShouldFeatureTypeError,
            (self.feature_id, self.feature_type, self.errors),
        )


class InvalidValueFeatureTypeError(Exception):
    def __init__(self, feature_id: str, feature_type: FeatureType, errors) -> None:
        super().__init__(
            f"The feature with id, {feature_id}, was not an appropriate feature type for the value function. It's type was {feature_type}. In most cases, this will happen if the feature type is not Value, so instead use the 'should' or 'should_custom' method."
        )
        self.feature_id = feature_id
        self.feature_type = feature_type
        self.errors = errors

    def __reduce__(self):
        return (
            InvalidValueFeatureTypeError,
            (self.feature_id, self.feature_type, self.errors),
        )
