package internal

import "fmt"

type InvalidShouldFeatureType struct {
	Detail string
}

func (e InvalidShouldFeatureType) Error() string {
	return fmt.Sprintf("should only supports toggle, gradual, and selective feature types. Tried type: %s", e.Detail)
}

func NewInvalidShouldFeatureTypeError(detail string) error {
	return &InvalidShouldFeatureType{Detail: detail}
}

type InvalidShouldFeatureValueType struct {
	Detail string
}

func (e InvalidShouldFeatureValueType) Error() string {
	return fmt.Sprintf("should selective features use the instance_id which is a &str. tried type: %s. consider using should_custom instead", e.Detail)
}

func NewInvalidShouldFeatureValueTypeError(detail string) error {
	return &InvalidShouldFeatureValueType{Detail: detail}
}

type InvalidShouldCustomGradualFeatureValueType struct {
	Detail string
}

func (e InvalidShouldCustomGradualFeatureValueType) Error() string {
	return fmt.Sprintf("should_custom gradual features only allow &str. tried type: %s.", e.Detail)
}

func NewInvalidShouldCustomGradualFeatureValueTypeError(detail string) error {
	return &InvalidShouldCustomGradualFeatureValueType{Detail: detail}
}

type InvalidShouldCustomStr struct {
	Detail string
}

func (e InvalidShouldCustomStr) Error() string {
	return fmt.Sprintf("should_custom_str only allows &str for the custom_id. the type passed in does not match the value type of the feature. tried type: %s", e.Detail)
}

func NewInvalidShouldCustomStrError(detail string) error {
	return &InvalidShouldCustomStr{Detail: detail}
}

type InvalidShouldCustomInt struct {
	Detail string
}

func (e InvalidShouldCustomInt) Error() string {
	return fmt.Sprintf("should_custom_int only allows i64 for the custom_id. the type passed in does not match the value type of the feature. tried type: %s", e.Detail)
}

func NewInvalidShouldCustomIntError(detail string) error {
	return &InvalidShouldCustomInt{Detail: detail}
}

type InvalidShouldCustomFloat struct {
	Detail string
}

func (e InvalidShouldCustomFloat) Error() string {
	return fmt.Sprintf("should_custom_float only allows f64 for the custom_id. the type passed in does not match the value type of the feature. tried type: %s", e.Detail)
}

func NewInvalidShouldCustomFloatError(detail string) error {
	return &InvalidShouldCustomFloat{Detail: detail}
}

type InvalidValueFeatureType struct {
	Detail string
}

func (e InvalidValueFeatureType) Error() string {
	return fmt.Sprintf("value only supports the value feature type. tried type: %s", e.Detail)
}

func NewInvalidValueFeatureTypeError(detail string) error {
	return &InvalidValueFeatureType{Detail: detail}
}

type InvalidValueStringType struct {
	Detail string
}

func (e InvalidValueStringType) Error() string {
	return fmt.Sprintf("value_str only supports a string value. tried type: %s", e.Detail)
}

func NewInvalidValueStringTypeError(detail string) error {
	return &InvalidValueStringType{Detail: detail}
}

type InvalidValueI64Type struct {
	Detail string
}

func (e InvalidValueI64Type) Error() string {
	return fmt.Sprintf("value_i64 only supports an i64 value. tried type: %s", e.Detail)
}

func NewInvalidValueI64TypeError(detail string) error {
	return &InvalidValueI64Type{Detail: detail}
}

type InvalidValueF64Type struct {
	Detail string
}

func (e InvalidValueF64Type) Error() string {
	return fmt.Sprintf("value_f64 only supports an f64 value. tried type: %s", e.Detail)
}

func NewInvalidValueF64TypeError(detail string) error {
	return &InvalidValueF64Type{Detail: detail}
}

type InvalidSchedule struct {
	Detail string
}

func (e InvalidSchedule) Error() string {
	return fmt.Sprintf("error parsing schedule: %s", e.Detail)
}

func NewInvalidScheduleError(detail string) error {
	return &InvalidSchedule{Detail: detail}
}

type GroupLookupKeyNotFound struct {
	Detail string
}

func (e GroupLookupKeyNotFound) Error() string {
	return fmt.Sprintf("could not get key on group_lookup_table")
}

func NewGroupLookupKeyNotFoundError(detail string) error {
	return &GroupLookupKeyNotFound{Detail: detail}
}

type FlagLookupKeyNotFound struct {
	Detail string
}

func (e FlagLookupKeyNotFound) Error() string {
	return fmt.Sprintf("could not get key on group_lookup_table")
}

func NewFlagLookupKeyNotFoundError(detail string) error {
	return &FlagLookupKeyNotFound{Detail: detail}
}

type FlagGroupKeyNotFound struct {
	Detail string
}

func (e FlagGroupKeyNotFound) Error() string {
	return fmt.Sprintf("could not get key on group_lookup_table")
}

func NewFlagGroupKeyNotFoundError(detail string) error {
	return &FlagGroupKeyNotFound{Detail: detail}
}

type EnvironmentLookupKeyNotFound struct {
	Detail string
}

func (e EnvironmentLookupKeyNotFound) Error() string {
	return fmt.Sprintf("could not get key on group_lookup_table")
}

func NewEnvironmentLookupKeyNotFoundError(detail string) error {
	return &EnvironmentLookupKeyNotFound{Detail: detail}
}

type EnvironmentFeatureKeyNotFound struct {
	Detail string
}

func (e EnvironmentFeatureKeyNotFound) Error() string {
	return fmt.Sprintf("could not get key on group_lookup_table")
}

func NewEnvironmentFeatureKeyNotFoundError(detail string) error {
	return &EnvironmentFeatureKeyNotFound{Detail: detail}
}

type UnknownVexillaError struct {
	Detail string
}

func (e UnknownVexillaError) Error() string {
	return fmt.Sprintf("unknown vexilla error")
}

func NewUnknownVexillaError(detail string) error {
	return &UnknownVexillaError{Detail: detail}
}
