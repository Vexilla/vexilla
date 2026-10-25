package internal

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
)

type ContractError struct{ Kind, Message string }

func (e *ContractError) Error() string     { return e.Message }
func ValidationError(message string) error { return &ContractError{"validation", message} }
func object(value interface{}, path string) (map[string]interface{}, error) {
	result, ok := value.(map[string]interface{})
	if !ok {
		return nil, ValidationError(path + ": expected an object")
	}
	return result, nil
}
func text(value interface{}, path string, nonempty bool) (string, error) {
	result, ok := value.(string)
	if !ok || nonempty && result == "" {
		return "", ValidationError(path + ": expected a string")
	}
	return result, nil
}
func number(value interface{}, path string, integer bool) error {
	n, ok := value.(float64)
	if !ok || math.IsNaN(n) || math.IsInf(n, 0) || integer && (math.Trunc(n) != n || math.Abs(n) > 9007199254740991) {
		return ValidationError(path + ": expected a finite number in the field's integer bounds")
	}
	return nil
}
func member(value interface{}, allowed ...string) bool {
	s, ok := value.(string)
	if !ok {
		return false
	}
	for _, a := range allowed {
		if s == a {
			return true
		}
	}
	return false
}
func safeID(value interface{}) (string, error) {
	id, err := text(value, "groupId", true)
	if err != nil {
		return "", err
	}
	if member(id, "manifest", "config", ".", "..") || strings.ContainsAny(id, "/\\\x00") {
		return "", ValidationError("Unsafe group file identifier")
	}
	return id, nil
}
func addAlias(aliases map[string]string, id, name string) error {
	for _, key := range []string{id, name, NormalizeName(name)} {
		if owner, ok := aliases[key]; ok && owner != id {
			return ValidationError("Alias shadows another ID: " + key)
		}
		aliases[key] = id
	}
	return nil
}
func samePrimitive(a, b interface{}) bool {
	switch value := a.(type) {
	case nil:
		return b == nil
	case string:
		other, ok := b.(string)
		return ok && value == other
	case bool:
		other, ok := b.(bool)
		return ok && value == other
	case float64:
		other, ok := b.(float64)
		return ok && value == other
	default:
		return false
	}
}
func validateSchedule(value interface{}) error {
	s, err := object(value, "schedule")
	if err != nil {
		return err
	}
	for _, key := range []string{"start", "end", "startTime", "endTime"} {
		if err := number(s[key], "schedule/"+key, true); err != nil {
			return err
		}
	}
	if !member(s["timeType"], "none", "start/end", "daily") {
		return ValidationError("Unsupported schedule timeType")
	}
	zone, err := text(s["timezone"], "timezone", true)
	if err != nil {
		return err
	}
	if !IsCompatibleTimezone(zone) {
		return ValidationError("Invalid timezone")
	}
	return nil
}
func validateFeature(value interface{}) error {
	f, err := object(value, "feature")
	if err != nil {
		return err
	}
	if _, err = text(f["name"], "name", false); err != nil {
		return err
	}
	if _, err = text(f["featureId"], "featureId", true); err != nil {
		return err
	}
	if !member(f["scheduleType"], "", "global", "environment") {
		return ValidationError("Unsupported scheduleType")
	}
	if err := validateSchedule(f["schedule"]); err != nil {
		return err
	}
	switch f["featureType"] {
	case "toggle":
		if _, ok := f["value"].(bool); !ok {
			return ValidationError("Toggle value must be boolean")
		}
	case "gradual":
		if err := number(f["value"], "value", false); err != nil {
			return err
		}
		if err := number(f["seed"], "seed", false); err != nil {
			return err
		}
		if f["seed"].(float64) <= 0 || f["seed"].(float64) > 1 {
			return ValidationError("seed must satisfy 0 < seed <= 1")
		}
	case "selective", "value":
		if !member(f["valueType"], "string", "number") {
			return ValidationError("Invalid valueType")
		}
		if f["valueType"] == "number" && !member(f["numberType"], "int", "float") {
			return ValidationError("Invalid numberType")
		}
		values := []interface{}{f["value"]}
		if f["featureType"] == "selective" {
			var ok bool
			values, ok = f["value"].([]interface{})
			if !ok {
				return ValidationError("Selective value must be an array")
			}
		}
		for _, item := range values {
			if f["valueType"] == "string" {
				if _, err := text(item, "value", false); err != nil {
					return err
				}
			} else if err := number(item, "value", f["numberType"] == "int"); err != nil {
				return err
			}
		}
	default:
		return ValidationError("Unsupported featureType")
	}
	return nil
}
func validateFeatures(value interface{}) (map[string]interface{}, error) {
	features, err := object(value, "features")
	if err != nil {
		return nil, err
	}
	aliases := map[string]string{}
	for id, value := range features {
		if err := validateFeature(value); err != nil {
			return nil, err
		}
		f := value.(map[string]interface{})
		if f["featureId"] != id {
			return nil, ValidationError("featureId must match map key")
		}
		if err := addAlias(aliases, id, f["name"].(string)); err != nil {
			return nil, err
		}
	}
	return features, nil
}
func validateManifest(value interface{}) error {
	m, err := object(value, "manifest")
	if err != nil {
		return err
	}
	if m["version"] != "v1" {
		return ValidationError("Manifest version must be v1")
	}
	groups, ok := m["groups"].([]interface{})
	if !ok {
		return ValidationError("Manifest groups must be an array")
	}
	aliases := map[string]string{}
	seen := map[string]bool{}
	for _, value := range groups {
		g, err := object(value, "manifest/group")
		if err != nil {
			return err
		}
		id, err := safeID(g["groupId"])
		if err != nil {
			return err
		}
		name, err := text(g["name"], "name", false)
		if err != nil {
			return err
		}
		if seen[id] {
			return ValidationError("Duplicate group ID")
		}
		seen[id] = true
		if err := addAlias(aliases, id, name); err != nil {
			return err
		}
	}
	return nil
}
func validateGroup(value interface{}) error {
	g, err := object(value, "group")
	if err != nil {
		return err
	}
	if _, err := safeID(g["groupId"]); err != nil {
		return err
	}
	if _, err := text(g["name"], "name", false); err != nil {
		return err
	}
	meta, err := object(g["meta"], "meta")
	if err != nil {
		return err
	}
	if meta["version"] != "v1" {
		return ValidationError("Group version must be v1")
	}
	defaults, err := validateFeatures(g["features"])
	if err != nil {
		return err
	}
	envs, err := object(g["environments"], "environments")
	if err != nil {
		return err
	}
	aliases := map[string]string{}
	for id, value := range envs {
		env, err := object(value, "environment")
		if err != nil {
			return err
		}
		if env["environmentId"] != id || id == "" {
			return ValidationError("environmentId must match map key")
		}
		name, err := text(env["name"], "name", false)
		if err != nil {
			return err
		}
		if err := addAlias(aliases, id, name); err != nil {
			return err
		}
		features, err := validateFeatures(env["features"])
		if err != nil {
			return err
		}
		if len(features) != len(defaults) {
			return ValidationError("Environment must have the exact group feature set")
		}
		for fid, value := range features {
			original, ok := defaults[fid]
			if !ok {
				return ValidationError("Environment feature not in group")
			}
			f, o := value.(map[string]interface{}), original.(map[string]interface{})
			for _, field := range []string{"name", "featureType", "valueType", "numberType"} {
				a, ap := f[field]
				b, bp := o[field]
				if ap != bp || !samePrimitive(a, b) {
					return ValidationError("Environment feature name/subtype differs from group")
				}
			}
		}
	}
	return nil
}
func normalizedWire(data []byte, validate func(interface{}) error) ([]byte, error) {
	if err := validateJSONUnicode(data); err != nil {
		return nil, err
	}
	var value interface{}
	if err := json.Unmarshal(data, &value); err != nil {
		return nil, ValidationError(err.Error())
	}
	if err := validate(value); err != nil {
		return nil, err
	}
	// Validation sees every original field. Typed native feature models do not
	// retain compatible properties belonging to an unused subtype.
	var selectFields func(interface{})
	selectFields = func(item interface{}) {
		switch node := item.(type) {
		case map[string]interface{}:
			if member(node["featureType"], "toggle", "gradual", "selective", "value") {
				if node["featureType"] != "gradual" {
					delete(node, "seed")
				}
				if member(node["featureType"], "toggle", "gradual") {
					delete(node, "valueType")
					delete(node, "numberType")
				} else if node["valueType"] != "number" {
					delete(node, "numberType")
				}
			}
			for _, child := range node {
				selectFields(child)
			}
		case []interface{}:
			for _, child := range node {
				selectFields(child)
			}
		}
	}
	selectFields(value)
	// Integer wire fields accept mathematical integers such as 42.0. Decode
	// only after validation, expressing those same values as native int tokens.
	normalized, err := json.Marshal(value)
	if err != nil {
		return nil, ValidationError(err.Error())
	}
	return normalized, nil
}
func ValidateGroupAgainstManifest(group Group, manifest Manifest) error {
	if err := ValidateUnicode(group); err != nil {
		return err
	}
	found := false
	for _, entry := range manifest.Groups {
		if entry.GroupId == group.GroupId && entry.Name == group.Name {
			found = true
		}
	}
	if !found {
		return ValidationError("Group must match its manifest ID and name")
	}
	data, err := json.Marshal(group)
	if err != nil {
		return ValidationError(err.Error())
	}
	_, err = normalizedWire(data, validateGroup)
	return err
}
func WrapFetchError(err error) error {
	return &ContractError{"fetch", fmt.Sprintf("Fetch failed: %v", err)}
}
