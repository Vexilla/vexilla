package internal

import (
	"math"
	"strconv"
)

func HashStringInstanceID(instanceID string, seed float64) float64 {
	chars := ([]byte)(instanceID)

	total := 0
	for _, char := range chars {
		total += (int)(char)
	}

	base := float64(total) * seed * 42.0

	return float64(int64(math.Trunc(float64(base)))%100) / 100
}

func HashIntInstanceID(instanceId int64, seed float64) float64 {
	stringInstanceId := strconv.Itoa(int(instanceId))
	return HashStringInstanceID(stringInstanceId, seed)
}

func HashFloatInstanceID(instanceId float64, seed float64) float64 {
	stringInstanceId := strconv.FormatFloat(instanceId, 'g', -1, 64)
	return HashStringInstanceID(stringInstanceId, seed)
}
