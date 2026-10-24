package internal

import (
	"fmt"
	"hash/fnv"
	"math"
	"strconv"
	"strings"
	"unicode/utf8"
)

func HashFnv32a(text string) uint32 {
	if !utf8.ValidString(text) { panic(&ContractError{"instance", "Instance ID must contain Unicode scalar values"}) }
	hash := fnv.New32a()
	_, _ = hash.Write([]byte(text))
	return hash.Sum32()
}
func HashStringInstanceID(instanceID string, seed float64) float64 {
	return math.Mod(float64(HashFnv32a(instanceID))*seed, 1000.0) / 1000.0
}
func InstanceText(instance interface{}) (string, error) {
	var numeric float64
	switch value := instance.(type) {
	case string:
		if !utf8.ValidString(value) {
			return "", fmt.Errorf("instance ID must contain Unicode scalar values")
		}
		return value, nil
	case int64:
		numeric = float64(value)
		if strconv.FormatFloat(numeric, 'f', 0, 64) != strconv.FormatInt(value, 10) {
			return "", fmt.Errorf("instance ID is not exactly representable as binary64")
		}
	case int:
		return InstanceText(int64(value))
	case float64:
		numeric = value
	default:
		return "", fmt.Errorf("a finite numeric or string instance ID is required")
	}
	if math.IsNaN(numeric) || math.IsInf(numeric, 0) {
		return "", fmt.Errorf("a finite instance ID is required")
	}
	if numeric == 0 {
		return "0", nil
	}
	if math.Abs(numeric) >= 1e-6 && math.Abs(numeric) < 1e21 {
		return strconv.FormatFloat(numeric, 'f', -1, 64), nil
	}
	text := strconv.FormatFloat(numeric, 'g', -1, 64)
	parts := strings.Split(text, "e")
	if len(parts) == 2 {
		exponent, _ := strconv.Atoi(parts[1])
		sign := ""
		if exponent >= 0 {
			sign = "+"
		}
		return parts[0] + "e" + sign + strconv.Itoa(exponent), nil
	}
	return text, nil
}
func HashIntInstanceID(instanceID int64, seed float64) float64 {
	text, err := InstanceText(instanceID)
	if err != nil {
		panic(err)
	}
	return HashStringInstanceID(text, seed)
}
func HashFloatInstanceID(instanceID float64, seed float64) float64 {
	text, err := InstanceText(instanceID)
	if err != nil {
		panic(err)
	}
	return HashStringInstanceID(text, seed)
}
