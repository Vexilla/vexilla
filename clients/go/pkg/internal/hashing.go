package internal

import (
	"hash/fnv"
	"strconv"
)

// const FNV32_OFFSET_BASIS = 2166136261
// const FNV32_PRIME = 16777619

func HashStringInstanceID(instanceID string, seed float64) float64 {
	chars := ([]byte)(instanceID)
	hash := fnv.New32a()
	hash.Write(chars)
	result := hash.Sum32()

	return float64(uint64(float64(result)*seed)%1000) / 1000.0
}

func HashIntInstanceID(instanceId int64, seed float64) float64 {
	stringInstanceId := strconv.Itoa(int(instanceId))
	return HashStringInstanceID(stringInstanceId, seed)
}

func HashFloatInstanceID(instanceId float64, seed float64) float64 {
	stringInstanceId := strconv.FormatFloat(instanceId, 'g', -1, 64)
	return HashStringInstanceID(stringInstanceId, seed)
}
