package internal

import "math"

func HashStringInstanceID(instanceID string, seed float64) int64 {
	chars := ([]byte)(instanceID)

	total := 0
	for _, char := range chars {
		total += (int)(char)
	}

	base := float64(total) * seed * 42.0

	return int64(math.Trunc(float64(base))) % 100

}
